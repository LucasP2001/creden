-- 011_colaboradores_status_recusado.sql — recusar convite passa a virar estado,
-- não apagar a linha. Assim reabrir o link mostra "convite recusado" em vez de
-- "não encontrado" (a linha some no delete). Rode uma vez no SQL Editor.

alter table public.colaboradores
  drop constraint if exists colaboradores_status_check;

alter table public.colaboradores
  add constraint colaboradores_status_check
  check (status in ('pendente', 'ativo', 'recusado'));
