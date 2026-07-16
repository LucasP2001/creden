-- 004_sessoes.sql — cronograma (sessoes) + marcacoes de interesse por sessao.

-- Cronograma do evento (array de sessoes)
alter table public.eventos
  add column if not exists sessoes jsonb not null default '[]'::jsonb;

-- Marcacoes: uma linha por (inscricao, sessao)
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

-- Leitura so pelo dono do evento (relatorio)
drop policy if exists "inscricoes_sessoes: dono le" on public.inscricoes_sessoes;
create policy "inscricoes_sessoes: dono le" on public.inscricoes_sessoes
  for select using (
    exists (select 1 from public.eventos e
            where e.id = inscricoes_sessoes.evento_id and e.user_id = auth.uid())
  );

-- Delete so pelo dono (limpeza; participante edita via service_role por token)
drop policy if exists "inscricoes_sessoes: dono apaga" on public.inscricoes_sessoes;
create policy "inscricoes_sessoes: dono apaga" on public.inscricoes_sessoes
  for delete using (
    exists (select 1 from public.eventos e
            where e.id = inscricoes_sessoes.evento_id and e.user_id = auth.uid())
  );
