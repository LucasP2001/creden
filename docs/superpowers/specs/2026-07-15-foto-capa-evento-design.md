# Foto de capa do evento — Design

Data: 2026-07-15
Status: aprovado (aguardando review do spec)

## Objetivo

Permitir que o organizador anexe uma foto de capa ao evento. A foto substitui o
gradiente CSS atual na página pública, aparece como thumbnail no card do dashboard
e no topo do ingresso. A foto é **opcional** — sem foto, mantém o gradiente atual
como fallback (nada quebra em eventos já existentes).

## Decisões

| Decisão | Escolha |
|---|---|
| Armazenamento | Supabase Storage, bucket público `eventos-capas` |
| Onde aparece | Página pública `/e/[slug]`, card do dashboard, ingresso `/i/[token]` |
| Obrigatória? | Não — fallback gradiente |
| Editar depois | Sim — botão "Trocar foto" no card do dashboard |

## Armazenamento

- Bucket **público** `eventos-capas`.
- Path do objeto: `{user_id}/{evento_id}.{ext}` — a primeira pasta é o `user_id`,
  o que permite policy de escrita por dono.
- Coluna nova em `eventos`: `imagem_url text null`. Guarda a URL pública completa.
  `null` = usa gradiente.
- Migration `002_evento_imagem.sql`:
  - `alter table public.eventos add column if not exists imagem_url text;`
  - criação do bucket `eventos-capas` (público);
  - policies de storage:
    - `select`: público (leitura anônima — página pública é anônima);
    - `insert`/`update`/`delete`: apenas o dono, via
      `auth.uid()::text = (storage.foldername(name))[1]`.

### Validação de imagem

- Formatos aceitos: `image/jpeg`, `image/png`, `image/webp`.
- Tamanho máximo: 5 MB.
- Validação no client (antes do upload) e defensiva na server action.
- Sem crop/aspect-ratio fixo nesta versão: a imagem é renderizada com
  `object-cover` em containers de proporção fixa por tela.

## Fase 1 — Storage + schema

Só infra, sem UI:

1. Migration `002_evento_imagem.sql` (coluna + bucket + policies).
2. Coluna `imagem_url` no tipo `Evento` (`types/index.ts`).
3. Aplicar migration no Supabase.

Verificação: `imagem_url` existe na tabela; bucket `eventos-capas` existe e é público;
policies aparecem no painel.

## Fase 2 — Upload no criar + render

### Componente compartilhado

`components/ImageUpload.tsx` (client):
- dropzone com `<input type="file" accept="image/*">`;
- preview via `URL.createObjectURL`;
- valida tipo e tamanho, mostra erro inline;
- expõe o `File` selecionado (via callback `onChange(file)` ou nome no form).
- Reutilizado no criar-form (fase 2) e no modal de edição (fase 3).

### Upload no criar evento

- `NovoEventoForm`: adiciona `ImageUpload` no topo do card "Informações do evento".
  O `File` vai no `FormData` como `capa`.
- `criarEvento` (server action) — nova ordem de gravação (o `evento_id` só existe
  após o insert):
  1. insere o evento (sem `imagem_url`) → obtém `id` (`.select('id').single()`);
  2. se veio arquivo `capa`: valida tipo/tamanho; faz upload em
     `{user_id}/{id}.{ext}` (`upsert: true`); obtém `getPublicUrl`;
     `update` da linha com `imagem_url`;
  3. se o upload falhar, loga e segue sem foto (não bloqueia a publicação —
     foto é opcional);
  4. redirect para `/dashboard`.

### Render (fallback gradiente em todos)

- **`/e/[slug]`** — hero: se `imagem_url`, `<img class="object-cover" />` cobrindo
  o container de 260px no lugar do gradiente; senão gradiente atual. Badge de vagas
  por cima (já é `absolute`).
- **`EventCard`** (dashboard) — thumbnail de capa no topo do card; fallback gradiente.
- **`/i/[token]`** — faixa/topo com a foto; fallback como está hoje.

Verificação: criar evento com foto mostra a foto nos 3 lugares; criar sem foto
mantém gradiente nos 3.

### next/image

`next.config.mjs` hoje não tem `images.remotePatterns`. Para usar `next/image`
com URLs do Supabase Storage é preciso adicionar o host do projeto Supabase a
`images.remotePatterns` (`{ protocol: 'https', hostname: '<ref>.supabase.co',
pathname: '/storage/v1/object/public/**' }`). Alternativa: usar `<img>` puro e
pular essa config — decidir na implementação. Recomendação: `next/image` +
`remotePatterns` (otimização automática vale a config única).

## Fase 3 — Editar via dashboard

- `EventCard` ganha botão "Trocar foto" → abre modal client com o `ImageUpload`.
- Nova server action `trocarCapa(eventoId, file)`:
  - valida dono (RLS já garante, mas checa `auth.uid()`);
  - upload no mesmo path `{user_id}/{evento_id}.{ext}` com `upsert: true`
    (sobrescreve);
  - `update` do `imagem_url` com cache-bust `?v={timestamp}` para forçar refresh
    do CDN/navegador;
  - `revalidatePath('/dashboard')`.

Verificação: trocar a foto de um evento existente atualiza card, página pública e
ingresso.

## Fora de escopo

- Crop / editor de imagem.
- Remover a foto (voltar pro gradiente) — pode virar melhoria depois.
- Múltiplas imagens / galeria.
- Otimização/resize server-side (confia no `next/image` no render).
