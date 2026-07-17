-- 007_periodo_inscricao.sql — janela de inscrição do evento.
-- Controla a entrada no evento e a escolha de palestras: fora do período, os
-- dois ficam fechados. Ambas nullable: null = sem limite, que é como todo
-- evento criado antes desta migration continua se comportando.

alter table public.eventos
  add column if not exists inscricoes_abrem_em timestamptz,
  add column if not exists inscricoes_fecham_em timestamptz;

comment on column public.eventos.inscricoes_abrem_em is
  'Início da janela de inscrição. Null = aberto desde sempre.';
comment on column public.eventos.inscricoes_fecham_em is
  'Fim da janela de inscrição (inclusivo). Null = sem prazo.';
