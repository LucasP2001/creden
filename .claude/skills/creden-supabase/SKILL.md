---
name: creden-supabase
description: Padrões de integração com Supabase no Creden — clients (browser/server), modelo de dados (eventos, inscricoes), RLS e índices. Use ao mexer em banco, auth, queries ou em lib/supabase.ts.
---

# Creden — Supabase

Supabase fornece banco, auth, storage e realtime.

## Clients

Centralizar em `lib/supabase.ts`. Separar sempre:

- **Browser client** — para componentes client (`'use client'`), usa a anon key.
- **Server client** — para Server Components / Route Handlers, lê cookies de sessão.

Nunca expor a `service_role` key no browser. Variáveis em `.env.local`
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

## Modelo de dados

- **eventos** — pertence a um organizador (`user_id`). Campos: nome, descrição, data/hora,
  local, vagas máximas, valor, slug público, campos extras do formulário (jsonb),
  `imagem_url text` (nullable — capa do evento; `null` usa o gradiente de fallback),
  `sessoes jsonb` (cronograma do evento — array de `Sessao`; `[]` quando não há programação).
- **inscricoes** — pertence a um evento (`evento_id`). Campos: nome, e-mail, dados extras (jsonb),
  status (`inscrito` | `presente` | `cancelado`), token do ingresso, hora do check-in.
- **inscricoes_sessoes** — marcações de interesse do participante em sessões do cronograma.
  Campos: `inscricao_id`, `evento_id`, `sessao_id` (id da sessão dentro do jsonb, não FK).
  **Unique** em `(inscricao_id, sessao_id)` — evita marcação duplicada.

Toda tabela com `created_at` e `updated_at`; **trigger** para `updated_at` automático.
Criar **índices** em `eventos.slug`, `eventos.user_id`, `inscricoes.evento_id`,
`inscricoes.token`, `inscricoes_sessoes.evento_id`, `inscricoes_sessoes.sessao_id`.

## Storage — capa do evento

Bucket **público** `eventos-capas`, para a imagem de capa em `eventos.imagem_url`.

- **Path do objeto:** `{user_id}/{evento_id}.{ext}` — a primeira pasta é o `user_id` do dono.
- **Policies:** `select` público (qualquer um lê); `insert`/`update`/`delete` somente pelo
  dono, via `auth.uid()::text = (storage.foldername(name))[1]`.
- **Formatos aceitos:** jpeg, png, webp; **máx. 5 MB** — validado em `lib/imagem.ts`.
- **Upload sempre via Server Action**, usando o client de sessão (RLS aplica); nunca usar
  a `service_role` key no browser.

## RLS (Row Level Security) — obrigatório

Políticas que garantem:

1. **Organizador só vê seus próprios eventos** (`auth.uid() = eventos.user_id`).
2. **Qualquer pessoa pode criar inscrição** numa página pública (insert anônimo em `inscricoes`).
3. **Somente o organizador do evento faz check-in** (update de status só por quem é dono do evento).
4. **`inscricoes_sessoes`**: insert anônimo (participante marca interesse na página pública/ingresso);
   select e delete só pelo organizador dono do evento (`auth.uid() = eventos.user_id` via join);
   o participante marca/desmarca pelo próprio ingresso (`/i/[token]`) usando o client **service_role**
   no servidor (autenticado pelo token, não por sessão) — nunca pela anon key direto do browser.

> Antes de afirmar nomes de colunas/tabelas, confira o SQL real em `supabase/` ou migrations —
> este é o desenho pretendido, pode ter evoluído.

Skills relacionadas: `creden-overview`, `creden-conventions`.
