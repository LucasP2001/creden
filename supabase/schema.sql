-- Creden — schema do Supabase (Etapa 3).
-- Execute no SQL Editor do projeto Supabase, ou via migrations.
-- Modelo descrito na skill creden-supabase.

-- ============================================================
-- Extensões
-- ============================================================
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ============================================================
-- Trigger genérico de updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- Tabela: eventos
-- ============================================================
create table if not exists public.eventos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  nome          text not null,
  descricao     text,
  data_hora     timestamptz not null,
  local         text,
  vagas_max     integer,
  valor         integer not null default 0,        -- 0 = grátis; senão centavos
  slug          text not null unique,
  imagem_url    text,                              -- capa (Storage); null = gradiente
  campos_extras jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists eventos_user_id_idx on public.eventos (user_id);
create index if not exists eventos_slug_idx     on public.eventos (slug);

drop trigger if exists eventos_set_updated_at on public.eventos;
create trigger eventos_set_updated_at
  before update on public.eventos
  for each row execute function public.set_updated_at();

-- ============================================================
-- Tabela: inscricoes
-- ============================================================
create type public.inscricao_status as enum ('inscrito', 'presente', 'cancelado');

create table if not exists public.inscricoes (
  id           uuid primary key default gen_random_uuid(),
  evento_id    uuid not null references public.eventos (id) on delete cascade,
  nome         text not null,
  email        text not null,
  dados_extras jsonb not null default '{}'::jsonb,
  status       public.inscricao_status not null default 'inscrito',
  token        text not null unique,
  checkin_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists inscricoes_evento_id_idx on public.inscricoes (evento_id);
create index if not exists inscricoes_token_idx      on public.inscricoes (token);

drop trigger if exists inscricoes_set_updated_at on public.inscricoes;
create trigger inscricoes_set_updated_at
  before update on public.inscricoes
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS — Row Level Security
-- ============================================================
alter table public.eventos     enable row level security;
alter table public.inscricoes  enable row level security;

-- --- eventos ---

-- 1) Organizador só vê / gerencia seus próprios eventos.
create policy "eventos: dono lê" on public.eventos
  for select using (auth.uid() = user_id);

create policy "eventos: dono insere" on public.eventos
  for insert with check (auth.uid() = user_id);

create policy "eventos: dono atualiza" on public.eventos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "eventos: dono apaga" on public.eventos
  for delete using (auth.uid() = user_id);

-- Leitura pública da página do evento (/e/[slug]) — qualquer um pode ler.
-- Se quiser esconder eventos em rascunho, adicione uma coluna `publicado` e filtre aqui.
create policy "eventos: leitura pública" on public.eventos
  for select to anon using (true);

-- --- inscricoes ---

-- 2) Qualquer pessoa pode criar inscrição numa página pública (insert anônimo).
create policy "inscricoes: insert público" on public.inscricoes
  for insert to anon, authenticated with check (true);

-- NOTA: NÃO há política de SELECT anônimo em inscricoes (de propósito).
-- O ingresso público (/i/[token]) é lido no servidor via createAdminSupabase()
-- (service_role), filtrando por token — o anônimo nunca consulta a tabela direto.
-- Uma policy `using (true)` aqui exporia toda a lista de inscritos (e-mails etc.),
-- então não a criamos. Quem migrou de uma versão anterior deve rodar:
--   drop policy if exists "inscricoes: leitura pública por token" on public.inscricoes;

-- Organizador do evento lê todas as inscrições do seu evento.
create policy "inscricoes: dono do evento lê" on public.inscricoes
  for select to authenticated using (
    exists (
      select 1 from public.eventos e
      where e.id = inscricoes.evento_id and e.user_id = auth.uid()
    )
  );

-- 3) Somente o organizador do evento faz check-in (update de status).
create policy "inscricoes: dono do evento atualiza" on public.inscricoes
  for update to authenticated using (
    exists (
      select 1 from public.eventos e
      where e.id = inscricoes.evento_id and e.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.eventos e
      where e.id = inscricoes.evento_id and e.user_id = auth.uid()
    )
  );
