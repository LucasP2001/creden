-- 003_cor_capa.sql — cor de fundo da capa do evento.
-- Fica atrás da imagem (contain); default branco.

alter table public.eventos
  add column if not exists cor_capa text not null default '#FFFFFF';
