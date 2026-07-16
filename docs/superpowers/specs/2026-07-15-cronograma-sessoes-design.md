# Cronograma + inscrição em sessões — Design

Data: 2026-07-15
Status: aprovado (aguardando review do spec)

## Objetivo

Eventos com programação (palestras, minicursos, serviços) espalhada em vários dias.
O organizador monta o cronograma; o participante vê a programação, marca interesse
nas sessões que quer (no momento da inscrição e depois pelo ingresso), e cada sessão
pode ter limite de vagas próprio. O organizador vê um relatório de quem marcou cada
sessão.

Caso motivador: I Semana Acadêmica de Gestão Hospitalar (3 dias, minicursos
simultâneos A/B, palestras, serviços SEMSA/SENAC).

## Decisões

| Decisão | Escolha |
|---|---|
| Cronograma armazenado | `eventos.sessoes jsonb` (padrão de `campos_extras`) |
| Marcações armazenadas | Tabela nova `inscricoes_sessoes` (conta vaga, lista) |
| Estrutura da sessão | dia + hora início/fim + título + tipo + palestrante? + local? + vagas_max? |
| Quando marcar | Na inscrição **e** depois, editável pelo ingresso `/i/[token]` |
| Vagas por sessão | Sim; lotada = não pode marcar. Validação no servidor no envio |
| Conflito de horário | Não bloqueia — pode marcar quantas quiser |
| Relatório | Tela nova `/eventos/[id]/sessoes`, só visualização (sem CSV agora) |

## Modelo de dados

### `eventos.sessoes` (jsonb, default `[]`)

Cada item (tipo `Sessao`):

```ts
interface Sessao {
  id: string          // gerado com crypto.randomUUID() (padrão de campos_extras)
  dia: string         // 'YYYY-MM-DD'
  hora_inicio: string // 'HH:MM'
  hora_fim: string    // 'HH:MM'
  titulo: string
  tipo: 'palestra' | 'minicurso' | 'servico' | 'outro'
  tipo_outro: string | null // rótulo livre quando tipo === 'outro'; senão null
  palestrante: string | null
  local: string | null
  vagas_max: number | null // null = ilimitado
}
```

Quando `tipo === 'outro'`, o form mostra um campo de texto para o organizador
escrever o nome do tipo (ex: "Mesa redonda", "Oficina"), guardado em `tipo_outro`.
Na exibição (badge), usa `tipo_outro` se presente, senão o rótulo padrão do `tipo`.

### Tabela `inscricoes_sessoes`

Uma linha = uma pessoa marcou uma sessão.

```sql
create table public.inscricoes_sessoes (
  id            uuid primary key default gen_random_uuid(),
  inscricao_id  uuid not null references public.inscricoes (id) on delete cascade,
  evento_id     uuid not null references public.eventos (id) on delete cascade,
  sessao_id     text not null,   -- id do item no jsonb sessoes
  created_at    timestamptz not null default now(),
  unique (inscricao_id, sessao_id)
);
create index inscricoes_sessoes_evento_idx on public.inscricoes_sessoes (evento_id);
create index inscricoes_sessoes_sessao_idx on public.inscricoes_sessoes (evento_id, sessao_id);
```

`evento_id` desnormalizado para contar vagas e alimentar o relatório sem join no jsonb.
`unique (inscricao_id, sessao_id)` impede marcação duplicada.

### RLS (segue o padrão de `inscricoes`)

```sql
alter table public.inscricoes_sessoes enable row level security;

-- Insert anônimo (participante marca ao se inscrever, na página pública)
create policy "inscricoes_sessoes: insert público" on public.inscricoes_sessoes
  for insert to anon, authenticated with check (true);

-- Leitura só pelo dono do evento (relatório /eventos/[id]/sessoes)
create policy "inscricoes_sessoes: dono lê" on public.inscricoes_sessoes
  for select using (
    exists (select 1 from public.eventos e
            where e.id = inscricoes_sessoes.evento_id and e.user_id = auth.uid())
  );

-- Delete pelo dono (limpeza) e delete via cascade da inscrição.
create policy "inscricoes_sessoes: dono apaga" on public.inscricoes_sessoes
  for delete using (
    exists (select 1 from public.eventos e
            where e.id = inscricoes_sessoes.evento_id and e.user_id = auth.uid())
  );
```

O participante lê/edita suas marcações pelo ingresso via `createAdminSupabase()`
(service_role) filtrando por token — mesmo padrão do ingresso, sem SELECT anônimo.

## Migration

`004_sessoes.sql`:
- `alter table public.eventos add column if not exists sessoes jsonb not null default '[]'::jsonb;`
- `create table ... inscricoes_sessoes ...` + índices;
- policies RLS acima.

## Tipos (`types/index.ts`)

- `Sessao` (acima).
- `Evento.sessoes: Sessao[]`.
- `TipoSessao` (union dos tipos).

## Fase 1 — Schema + tipos

Migration + tipos + refletir no `schema.sql`. Verificação: colunas/tabela existem,
build passa.

## Fase 2 — Organizador monta o cronograma (EventoForm)

Bloco "Programação" no `EventoForm` (criar/editar), estado client como o de
`campos_extras`:
- lista de sessões; cada uma: dia (date), hora início/fim (time), título (text),
  tipo (select); se tipo = "outro", campo de texto tipo_outro pro rótulo livre;
  palestrante (text opcional), local (text opcional), vagas_max (number opcional);
- botão "＋ Adicionar sessão"; remover por item;
- vai no FormData como `sessoes` (JSON), igual `campos_extras`.

As actions `criarEvento` e `atualizarEvento`/`payload.ts` passam a gravar `sessoes`
(parse do JSON, com fallback `[]`). `id` de cada sessão gerado com
`crypto.randomUUID()`.

Verificação: criar/editar evento com sessões persiste o jsonb.

## Fase 3 — Cronograma na página pública (read-only)

Seção "Programação" na `/e/[slug]`: sessões agrupadas por dia (ordenadas por
`dia` depois `hora_inicio`), cada uma mostra horário, título, tipo (badge),
palestrante e local quando houver. Se `vagas_max`, mostra "X de Y vagas" (contagem
vinda de `inscricoes_sessoes`). Read-only.

Verificação: página pública lista a programação agrupada por dia.

## Fase 4 — Marcar interesse na inscrição

Na `/e/[slug]/inscricao`, após os campos: cronograma com checkbox por sessão.
Sessão lotada aparece desabilitada ("Vagas esgotadas"). Sem trava de conflito.
Vai no FormData como `sessoes_marcadas` (array de ids).

A action de inscrição, após criar a `inscricao`:
1. relê a contagem de cada sessão marcada;
2. para cada sessão com `vagas_max`, insere em `inscricoes_sessoes` só se ainda há
   vaga (checagem no servidor evita corrida); sessões sem vaga são ignoradas e
   reportadas ao participante ("Estas sessões lotaram: ...");
3. sessões sem `vagas_max` sempre inserem.

Verificação: inscrição grava as marcações; sessão lotada é rejeitada com aviso.

## Fase 5 — Editar marcações pelo ingresso

Na `/i/[token]` (lida via service_role), seção "Minhas sessões": lista as sessões
do evento com checkbox refletindo as marcações atuais. Server action
`atualizarSessoes(token, sessaoIds)`:
- valida o token (service_role);
- reconcilia: insere as novas (respeitando vaga), remove as desmarcadas;
- `revalidatePath` do ingresso.

Verificação: marcar/desmarcar pelo ingresso persiste; vaga respeitada.

## Fase 6 — Relatório por sessão (organizador)

Tela nova `/eventos/[id]/sessoes` (guarda de dono, como `/editar`):
- para cada sessão do evento: título, horário, tipo, "X de Y vagas" (ou "X marcações"
  se ilimitada), e a lista de quem marcou (nome + email dos inscritos, via join
  `inscricoes_sessoes` → `inscricoes`);
- link a partir do card do dashboard e/ou da tela de inscritos.

Verificação: organizador vê contagem e nomes por sessão.

## Fora de escopo

- Export CSV do relatório (fica pra depois).
- Bloqueio de conflito de horário.
- Check-in por sessão (só o check-in do evento existe).
- Fila de espera quando sessão lota.
- Edição de sessão que já tem marcações mudando `id` (o `id` é estável uma vez criado).

## Riscos / notas

- **Estabilidade do `sessao_id`:** as marcações referenciam `sessao_id` (texto, do
  jsonb). Se o organizador remover uma sessão já marcada, ficam linhas órfãs em
  `inscricoes_sessoes`. Mitigação simples: ao salvar o evento, apagar marcações cujo
  `sessao_id` não existe mais no jsonb (limpeza na action de editar). Documentar.
- **Corrida de vaga:** a checagem no servidor reduz, mas duas inserções concorrentes
  ainda podem estourar em 1. Aceitável para o público-alvo (eventos pequenos/médios);
  não implementar lock pesado agora.
