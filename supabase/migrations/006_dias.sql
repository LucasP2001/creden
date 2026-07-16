-- 006_dias.sql — cronograma vira dias[] -> (sessoes soltas + categorias[] -> sessoes).
-- Converte a coluna categorias[] (do 005) para dias[] antes de dropá-la.
--
-- Conversão: cada categoria atual vira um Dia. O título antigo da categoria
-- (ex: "Dia 01 (10/08) — Gestão Municipal") é mantido dentro do dia como uma
-- categoria interna, e a data do dia fica vazia (o organizador ajusta no form).
-- Preserva os sessao_id (marcações continuam válidas).

alter table public.eventos
  add column if not exists dias jsonb not null default '[]'::jsonb;

update public.eventos e
set dias = (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', gen_random_uuid()::text,
        'data', '',
        'sessoes', '[]'::jsonb,
        'categorias', jsonb_build_array(cat)
      )
      order by ord
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(e.categorias) with ordinality as t(cat, ord)
)
where jsonb_array_length(e.categorias) > 0;

alter table public.eventos drop column if exists categorias;
