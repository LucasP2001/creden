-- 009_colaboradores.sql — co-organizadores por evento.
-- Papéis: 'editor' (mexe em tudo, menos apagar/transferir) e 'checkin' (só a
-- portaria + ver a lista). Convite por e-mail; aceite explícito via /convite/[token].
-- Rode uma vez no SQL Editor do Supabase (idempotente).

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
  on public.colaboradores (evento_id, lower(email));
create index if not exists colaboradores_evento_idx on public.colaboradores (evento_id);
create index if not exists colaboradores_user_idx   on public.colaboradores (user_id);
create index if not exists colaboradores_token_idx  on public.colaboradores (token);

drop trigger if exists colaboradores_set_updated_at on public.colaboradores;
create trigger colaboradores_set_updated_at
  before update on public.colaboradores
  for each row execute function public.set_updated_at();

-- Funções de acesso. SECURITY DEFINER para poder ler colaboradores/eventos sem
-- recursão de RLS; STABLE porque só leem.
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

-- eventos: colaborador ativo passa a enxergar/editar (dono continua podendo tudo).
drop policy if exists "eventos: dono lê" on public.eventos;
create policy "eventos: pode ver" on public.eventos
  for select using (public.pode_ver_evento(id));

drop policy if exists "eventos: dono atualiza" on public.eventos;
create policy "eventos: pode editar" on public.eventos
  for update using (public.pode_editar_evento(id)) with check (public.pode_editar_evento(id));
-- (inserir/apagar continuam só do dono — policies inalteradas.)

-- inscricoes: leitura/atualização por qualquer um que pode ver o evento.
drop policy if exists "inscricoes: dono do evento lê" on public.inscricoes;
create policy "inscricoes: organizador lê" on public.inscricoes
  for select using (public.pode_ver_evento(evento_id));

drop policy if exists "inscricoes: dono do evento atualiza" on public.inscricoes;
create policy "inscricoes: organizador atualiza" on public.inscricoes
  for update using (public.pode_ver_evento(evento_id))
  with check (public.pode_ver_evento(evento_id));

-- colaboradores: dono do evento gerencia; convidado vê a própria linha.
create policy "colaboradores: dono gerencia" on public.colaboradores
  for all
  using (exists (select 1 from eventos e where e.id = colaboradores.evento_id and e.user_id = auth.uid()))
  with check (exists (select 1 from eventos e where e.id = colaboradores.evento_id and e.user_id = auth.uid()));

create policy "colaboradores: convidado vê a própria" on public.colaboradores
  for select using (auth.uid() = user_id);
