-- 010_colaboradores_unique_email.sql — troca o índice único funcional por um em
-- coluna crua, para o upsert onConflict (evento_id,email) casar. O email já é
-- gravado sempre em lowercase pela action de convite. Rode no SQL Editor.
drop index if exists public.colaboradores_evento_email_uidx;
create unique index if not exists colaboradores_evento_email_uidx
  on public.colaboradores (evento_id, email);
