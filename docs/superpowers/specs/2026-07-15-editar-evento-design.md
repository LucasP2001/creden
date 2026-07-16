# Editar evento — design

Data: 2026-07-15
Branch: feat/foto-capa-evento

## Objetivo

Permitir que o organizador edite os campos de um evento já criado (nome, descrição,
data/hora, local, vagas, valor, campos extras e capa) através de uma tela dedicada
`/eventos/[id]/editar`. Hoje só existe criar (`/eventos/novo`) e trocar a capa pelo
dashboard — não há como alterar os demais campos.

## Escopo

Incluído:
- Rota `/eventos/[id]/editar` (Server Component) com guarda de dono.
- Form único parametrizado que serve criar **e** editar (generalização do form atual).
- Action `atualizarEvento` (update dos campos + troca opcional de capa).
- Botão "Editar" no card do dashboard.

Fora de escopo:
- Editar o slug (fica read-only — ver decisão abaixo).
- Cancelar/excluir evento.
- Histórico/auditoria de alterações.

## Decisões

1. **Slug read-only.** Após criar, o slug não muda. Protege links públicos e QR já
   compartilhados de quebrarem. A tela de editar mostra o slug atual apenas para
   visualização.

2. **Form único parametrizado.** `NovoEventoForm` vira `EventoForm`, recebendo
   `evento?` e `modo: 'criar' | 'editar'`. Um só componente serve as duas telas —
   evita duplicação e drift. Alternativa (form separado) foi rejeitada: dois forms
   divergiriam com o tempo.

3. **Capa reaproveita fluxo existente.** `ImageUpload` já aceita `defaultPreview` —
   passa a `imagem_url` atual. Se nenhum arquivo novo for enviado, mantém a capa.

## Arquitetura

### Componente `EventoForm` (renomear de `NovoEventoForm`)

Arquivo: `app/eventos/EventoForm.tsx` (movido de `app/eventos/novo/NovoEventoForm.tsx`,
pois agora é compartilhado por duas rotas).

Props:
```ts
interface EventoFormProps {
  modo: 'criar' | 'editar'
  evento?: Evento   // presente só em modo 'editar'
}
```

Comportamento por modo:
- Estado inicial (`nome`, `valorPago`, `campos`) semeado de `evento` quando presente;
  caso contrário, vazio como hoje.
- Campos usam `defaultValue` derivado de `evento` (data_hora formatada para
  `datetime-local`, valor em reais).
- `ImageUpload` recebe `defaultPreview={evento?.imagem_url}`.
- `criar`: chama `criarEvento`, botão "Publicar evento".
- `editar`: chama `atualizarEvento(evento.id, formData)`, botão "Salvar alterações".
- Aside: em `criar` mostra "URL pública gerada" (dinâmica do nome); em `editar`
  mostra o slug atual como read-only ("URL pública" fixa, sem edição).

### Rota `/eventos/[id]/editar/page.tsx`

Server Component:
1. `createServerSupabase()`, busca evento por `id`.
2. Guarda: se não existe **ou** `evento.user_id !== user.id` → `notFound()`.
   (RLS já filtra por dono no select, mas a guarda dá 404 explícito.)
3. Renderiza `<EventoForm modo="editar" evento={ev} />` dentro do mesmo layout
   de `/eventos/novo` (header + título "Editar evento").

### Action `atualizarEvento`

Arquivo: `app/eventos/[id]/editar/actions.ts`.

```ts
async function atualizarEvento(eventoId: string, formData: FormData): Promise<Result>
```

Passos:
1. `getUser()` — exige login.
2. Confere que o evento pertence ao user (select `user_id`); senão erro.
3. Valida `nome` e `data_hora` (mesmas regras do criar).
4. `update` em `eventos`: nome, descricao, data_hora, local, vagas_max, valor,
   campos_extras. **Slug não entra no update.**
5. Capa: se `formData.get('capa')` é File novo e válido, roda o upload
   (via helper compartilhado — ver abaixo) e inclui `imagem_url` no update.
6. `revalidatePath('/dashboard')` + `revalidatePath('/e/[slug]', 'page')`.
7. `redirect('/dashboard')`.

### Helper compartilhado de upload de capa

O bloco de upload (hoje duplicado entre `criarEvento` e o TrocarCapaModal) vira:

Arquivo: `lib/capa.ts`
```ts
// Faz upload da capa no bucket e retorna a publicUrl, ou null se não houver
// arquivo / falhar. Path: {userId}/{eventoId}.{ext}
async function uploadCapa(supabase, userId, eventoId, capa: FormDataEntryValue | null): Promise<string | null>
```

`criarEvento` e `atualizarEvento` passam a usar esse helper — remove duplicação.

### Botão "Editar" no dashboard

`components/EventCard.tsx`: ao lado de "Gerenciar", adicionar
`<ButtonLink variant="ghost" href={`/eventos/${evento.id}/editar`}>Editar</ButtonLink>`.

## Fluxo de dados

```
Dashboard (EventCard) --"Editar"--> /eventos/[id]/editar
  page.tsx: busca evento (guarda dono) --> <EventoForm modo="editar" evento=ev>
    submit --> atualizarEvento(id, formData)
      update campos + (opcional) uploadCapa --> revalidate --> redirect /dashboard
```

## Tratamento de erro

- Evento inexistente ou de outro dono → `notFound()` (404).
- Falha de validação (nome/data vazios) → retorna `{ ok:false, erro }`, exibido no form.
- Falha de upload de capa → não bloqueia o save dos demais campos (capa é opcional),
  igual ao comportamento do criar.

## Testes / verificação

- Editar cada campo e confirmar persistência (recarregar página pública/dashboard).
- Trocar a capa via tela de editar; confirmar cache-bust (nova URL/versão).
- Salvar sem tocar na capa → capa preservada.
- Tentar editar evento de outro usuário (URL direta) → 404.
- `npm run build` limpo; `/eventos/novo` continua funcionando (regressão do form).

## Impacto em arquivos

- Mover: `app/eventos/novo/NovoEventoForm.tsx` → `app/eventos/EventoForm.tsx` (parametrizado).
- Editar: `app/eventos/novo/page.tsx` (usa `<EventoForm modo="criar" />`).
- Novo: `app/eventos/[id]/editar/page.tsx`, `app/eventos/[id]/editar/actions.ts`.
- Novo: `lib/capa.ts` (helper de upload).
- Editar: `app/eventos/novo/actions.ts` (usa helper).
- Editar: `components/EventCard.tsx` (botão Editar).
