# Categorias no cronograma — Design

Data: 2026-07-15
Status: aprovado (aguardando review do spec)

## Objetivo

Hoje o cronograma agrupa sessões automaticamente por `dia`. Trocar por **categorias
nomeadas**: o organizador cria categorias (ex: "Dia 01 (10/08) — Gestão Municipal e
Políticas Públicas") e coloca sessões dentro. Vários grupos, inclusive do mesmo dia.
A exibição agrupa por categoria, na ordem definida pelo organizador.

Motivação: as programações reais (I Semana Acadêmica) têm temas nomeados por dia,
não só datas. A data vai no título da categoria; a sessão guarda só o horário.

## Decisões

| Decisão | Escolha |
|---|---|
| Modelo | `eventos.categorias jsonb`; cada categoria tem `titulo` + `sessoes: Sessao[]` |
| Categoria | Só `id` + `titulo` (sem subtítulo) |
| `dia` na sessão | **Removido** — data vai no título da categoria |
| Agrupamento na exibição | Por categoria, na ordem do array (não mais por dia) |
| Migração de dados | Evento existente: `sessoes` → uma categoria por dia distinto ("Dia N") |
| Marcações | `inscricoes_sessoes.sessao_id` inalterado (id da sessão); funções varrem todas as categorias |

## Modelo de dados

```ts
export interface Sessao {
  id: string
  // 'dia' REMOVIDO
  hora_inicio: string // 'HH:MM'
  hora_fim: string    // 'HH:MM'
  titulo: string
  tipo: 'palestra' | 'minicurso' | 'servico' | 'outro'
  tipo_outro: string | null
  palestrante: string | null
  local: string | null
  vagas_max: number | null
}

export interface Categoria {
  id: string           // crypto.randomUUID()
  titulo: string       // ex: "Dia 01 (10/08) — Gestão Municipal e Políticas Públicas"
  sessoes: Sessao[]
}
```

`Evento.categorias: Categoria[]` substitui `Evento.sessoes`.

### Coluna e migração

`eventos.categorias jsonb not null default '[]'::jsonb` substitui `eventos.sessoes`.

Migration `005_categorias.sql`:
1. `add column if not exists categorias jsonb not null default '[]'::jsonb;`
2. Converter dados existentes: para cada evento com `sessoes` não-vazio, agrupar as
   sessões por `dia` (distinto, ordenado), criar uma categoria por dia com
   `titulo = 'Dia ' || (data formatada)` e as sessões daquele dia (sem o campo `dia`).
   Feito em PL/pgSQL ou via `jsonb` functions.
3. `drop column sessoes;` (após conversão).

A migração preserva os `sessao_id` (id de cada sessão) — as marcações em
`inscricoes_sessoes` continuam válidas.

## Helpers (`lib/sessoes.ts`)

- Remover `agruparPorDia`.
- Manter `novaSessao` (sem `dia`), `rotuloTipo`.
- `parseSessoes` → `parseCategorias(json): Categoria[]` (parse do novo formato).
- Adicionar `novaCategoria(): Categoria`.
- Adicionar `todasSessoes(categorias: Categoria[]): Sessao[]` (achata — usado por
  contagem/validação de vaga).

## Marcações (`lib/marcacoes.ts`)

As funções que recebiam `sessoes: Sessao[]` passam a receber `categorias: Categoria[]`
e usam `todasSessoes()` internamente. Assinaturas afetadas:
- `idsDeSessoes(categorias)` → ids de todas as sessões.
- `limparOrfaos(admin, eventoId, categorias)`.
- `gravarMarcacoes(admin, eventoId, inscricaoId, sessaoIds, categorias)`.
- `reconciliarMarcacoes(admin, eventoId, inscricaoId, desejadas, categorias)`.
- `contarPorSessao`/`marcacoesDaInscricao` — inalteradas (operam na tabela).

## Form do organizador (`EventoForm`)

Bloco "Programação" vira dois níveis:
- Lista de categorias; cada uma com input de título + botão remover.
- Dentro de cada categoria, a lista de sessões (mesmos campos de hoje, menos `dia`)
  + botão "＋ Adicionar sessão".
- Botão "＋ Adicionar categoria" no topo do bloco.
- Estado client `categorias: Categoria[]`; vai no FormData como `categorias` (JSON).

## Render (pública, inscrição, ingresso, relatório)

- **`components/Cronograma.tsx`** — recebe `categorias`; itera categorias na ordem do
  array; para cada, mostra o `titulo` como cabeçalho e as sessões dentro (sem
  reordenar por dia). Mantém badge de tipo, vagas, palestrante, local.
- **`/e/[slug]`** — passa `ev.categorias`.
- **inscrição** — checkboxes agrupados por categoria (título da categoria como
  cabeçalho).
- **ingresso** (`SessoesEditor`) — idem, agrupado por categoria.
- **relatório** (`/eventos/[id]/sessoes`) — agrupa por categoria; título da categoria
  como cabeçalho.

## Actions

- `criarEvento`, `payload.ts` (editar): gravam `categorias` (via `parseCategorias`)
  no lugar de `sessoes`.
- `atualizarEvento`: `limparOrfaos` passa a receber `payload.categorias`.
- `inscrever`, `atualizarSessoes`: passam `evento.categorias` para as funções de
  marcação.

## Testes

- Remover testes de `agruparPorDia`.
- Adicionar testes de `novaCategoria`, `parseCategorias`, `todasSessoes`.
- Ajustar teste de `idsDeSessoes` (agora recebe categorias).
- `montarPayloadUpdate`: incluir `categorias` (teste do parse).

## SQL do evento (I Semana Acadêmica)

Após a migration converter o evento existente, verificar se as categorias ficaram
como esperado (3 dias → 3 categorias). Se a conversão automática não gerar títulos
bons (ex: "Dia 2026-08-10" em vez do tema), fornecer um UPDATE manual opcional que
renomeia as categorias para os temas das fotos:
- Dia 01 → "Dia 01 (10/08) — Gestão Municipal e Políticas Públicas"
- Dia 02 → "Dia 02 (11/08) — Qualidade, Eficiência e Segurança na Gestão em Saúde"
- Dia 03 → "Dia 03 (12/08) — Prática, Inovação e Ações SEMSA/SENAC"

## Fora de escopo

- Subtítulo/foco por categoria (só título).
- Reordenar categorias por drag-and-drop (ordem = ordem de criação; remover/recriar
  pra reordenar).
- Check-in por sessão.

## Riscos

- **Migração destrutiva** (`drop column sessoes`): fazer a conversão ANTES do drop na
  mesma migration; testar o SQL de conversão no evento real antes de dropar. Como o
  evento já existe, a conversão precisa rodar de verdade — validar o resultado.
- **Amplitude:** toca ~13 arquivos (todos os que hoje usam `agruparPorDia`/`.sessoes`).
  Reforma coordenada; um plano por tasks reduz risco.
