-- inscricoes_sessoes: leitura por qualquer um que pode ver o evento (dono OU
-- colaborador ativo), alinhando com eventos/inscricoes (migration 009).
--
-- A policy original de SELECT ficou owner-only (e.user_id = auth.uid()) e nao
-- foi promovida junto com as outras tabelas na 009. Efeito: colaborador
-- (editor/checkin) abre a lista de inscritos e o export, mas as marcacoes de
-- sessao voltam vazias sem erro — filtro por sessao nunca casa e o XLSX sai com
-- as colunas de sessao em branco. Esta migration corrige.
--
-- DELETE segue owner-only (limpeza; participante edita via service_role por token).

drop policy if exists "inscricoes_sessoes: dono le" on public.inscricoes_sessoes;
create policy "inscricoes_sessoes: organizador le" on public.inscricoes_sessoes
  for select using (public.pode_ver_evento(evento_id));
