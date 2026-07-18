-- 008_fuso_evento.sql — fuso horário do evento.
-- A hora do evento passa a ser interpretada e exibida no fuso escolhido pelo
-- organizador (detectado do dispositivo dele ao criar). Assim quem cria em
-- Manaus vê "Manaus" e quem cria em São Paulo vê "Brasília", com o rótulo
-- explícito para o participante.
--
-- Default America/Sao_Paulo: todo evento criado antes desta migration já vinha
-- sendo tratado como horário de Brasília, então o default preserva o que já era.

alter table public.eventos
  add column if not exists fuso text not null default 'America/Sao_Paulo';

comment on column public.eventos.fuso is
  'Fuso IANA do evento (ex: America/Sao_Paulo, America/Manaus). A data_hora é interpretada e exibida neste fuso.';
