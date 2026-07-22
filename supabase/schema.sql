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
  dias          jsonb not null default '[]'::jsonb, -- cronograma (ver skill creden-supabase)
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

-- ============================================================
-- Tabela: inscricoes_sessoes
-- ============================================================
create table if not exists public.inscricoes_sessoes (
  id            uuid primary key default gen_random_uuid(),
  inscricao_id  uuid not null references public.inscricoes (id) on delete cascade,
  evento_id     uuid not null references public.eventos (id) on delete cascade,
  sessao_id     text not null,
  created_at    timestamptz not null default now(),
  unique (inscricao_id, sessao_id)
);

create index if not exists inscricoes_sessoes_evento_idx
  on public.inscricoes_sessoes (evento_id);
create index if not exists inscricoes_sessoes_sessao_idx
  on public.inscricoes_sessoes (evento_id, sessao_id);

alter table public.inscricoes_sessoes enable row level security;

-- Insert anonimo (participante marca ao se inscrever na pagina publica)
drop policy if exists "inscricoes_sessoes: insert publico" on public.inscricoes_sessoes;
create policy "inscricoes_sessoes: insert publico" on public.inscricoes_sessoes
  for insert to anon, authenticated with check (true);

-- Leitura por quem pode ver o evento: dono OU colaborador ativo (relatorio,
-- filtro por sessao, export XLSX). Alinha com eventos/inscricoes (migration 009).
drop policy if exists "inscricoes_sessoes: dono le" on public.inscricoes_sessoes;
drop policy if exists "inscricoes_sessoes: organizador le" on public.inscricoes_sessoes;
create policy "inscricoes_sessoes: organizador le" on public.inscricoes_sessoes
  for select using (public.pode_ver_evento(evento_id));

-- Delete so pelo dono (limpeza; participante edita via service_role por token)
drop policy if exists "inscricoes_sessoes: dono apaga" on public.inscricoes_sessoes;
create policy "inscricoes_sessoes: dono apaga" on public.inscricoes_sessoes
  for delete using (
    exists (select 1 from public.eventos e
            where e.id = inscricoes_sessoes.evento_id and e.user_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Colaboradores (co-organizadores por evento) — ver migration 009.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.colaboradores (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid not null references public.eventos(id) on delete cascade,
  email       text not null,
  user_id     uuid references auth.users(id) on delete cascade,
  papel       text not null check (papel in ('editor','checkin')),
  status      text not null default 'pendente' check (status in ('pendente','ativo')),
  token       text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists colaboradores_evento_email_uidx
  on public.colaboradores (evento_id, email);
create index if not exists colaboradores_evento_idx on public.colaboradores (evento_id);
create index if not exists colaboradores_user_idx   on public.colaboradores (user_id);
create index if not exists colaboradores_token_idx  on public.colaboradores (token);

drop trigger if exists colaboradores_set_updated_at on public.colaboradores;
create trigger colaboradores_set_updated_at
  before update on public.colaboradores
  for each row execute function public.set_updated_at();

create or replace function public.pode_ver_evento(ev uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from eventos e where e.id = ev and e.user_id = auth.uid())
      or exists (select 1 from colaboradores c
                 where c.evento_id = ev and c.user_id = auth.uid() and c.status = 'ativo');
$$;

create or replace function public.pode_editar_evento(ev uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from eventos e where e.id = ev and e.user_id = auth.uid())
      or exists (select 1 from colaboradores c
                 where c.evento_id = ev and c.user_id = auth.uid()
                   and c.status = 'ativo' and c.papel = 'editor');
$$;

alter table public.colaboradores enable row level security;

drop policy if exists "eventos: dono lê" on public.eventos;
create policy "eventos: pode ver" on public.eventos
  for select using (public.pode_ver_evento(id));

drop policy if exists "eventos: dono atualiza" on public.eventos;
create policy "eventos: pode editar" on public.eventos
  for update using (public.pode_editar_evento(id)) with check (public.pode_editar_evento(id));

drop policy if exists "inscricoes: dono do evento lê" on public.inscricoes;
create policy "inscricoes: organizador lê" on public.inscricoes
  for select using (public.pode_ver_evento(evento_id));

drop policy if exists "inscricoes: dono do evento atualiza" on public.inscricoes;
create policy "inscricoes: organizador atualiza" on public.inscricoes
  for update using (public.pode_ver_evento(evento_id))
  with check (public.pode_ver_evento(evento_id));

create policy "colaboradores: dono gerencia" on public.colaboradores
  for all
  using (exists (select 1 from eventos e where e.id = colaboradores.evento_id and e.user_id = auth.uid()))
  with check (exists (select 1 from eventos e where e.id = colaboradores.evento_id and e.user_id = auth.uid()));

create policy "colaboradores: convidado vê a própria" on public.colaboradores
  for select using (auth.uid() = user_id);
