-- Migração 001 — remove a política de SELECT anônimo insegura em inscricoes.
--
-- Por quê: a policy "inscricoes: leitura pública por token" usava `using (true)`,
-- que libera SELECT anônimo de QUALQUER linha (RLS filtra linhas, não obriga a
-- query a filtrar por token). Isso exporia a lista de inscritos e e-mails.
-- O app não depende dela: o ingresso /i/[token] é lido no servidor com service_role.
--
-- Rode uma vez no SQL Editor do Supabase (idempotente).

drop policy if exists "inscricoes: leitura pública por token" on public.inscricoes;
