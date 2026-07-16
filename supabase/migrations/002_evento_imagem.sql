-- 002_evento_imagem.sql — foto de capa do evento.
-- Coluna imagem_url + bucket público eventos-capas + policies por dono.

-- Coluna (URL pública completa; null = usa gradiente)
alter table public.eventos
  add column if not exists imagem_url text;

-- Bucket público de capas
insert into storage.buckets (id, name, public)
values ('eventos-capas', 'eventos-capas', true)
on conflict (id) do nothing;

-- Leitura pública (página pública é anônima)
drop policy if exists "capas leitura publica" on storage.objects;
create policy "capas leitura publica"
  on storage.objects for select
  using ( bucket_id = 'eventos-capas' );

-- Escrita/atualização/remoção apenas pelo dono.
-- Path é {user_id}/{evento_id}.ext — a 1ª pasta é o user_id.
drop policy if exists "capas insere dono" on storage.objects;
create policy "capas insere dono"
  on storage.objects for insert
  with check (
    bucket_id = 'eventos-capas'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "capas atualiza dono" on storage.objects;
create policy "capas atualiza dono"
  on storage.objects for update
  using (
    bucket_id = 'eventos-capas'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "capas remove dono" on storage.objects;
create policy "capas remove dono"
  on storage.objects for delete
  using (
    bucket_id = 'eventos-capas'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
