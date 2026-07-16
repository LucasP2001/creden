-- 005_categorias.sql — cronograma passa de sessoes[] para categorias[] { titulo, sessoes[] }.
-- Converte dados existentes (1 dia distinto -> 1 categoria) ANTES de dropar sessoes.

alter table public.eventos
  add column if not exists categorias jsonb not null default '[]'::jsonb;

-- Conversão: para cada evento com sessoes não-vazio, agrupa por dia distinto
-- (ordenado) e cria uma categoria por dia. Preserva o campo dia de cada sessão.
update public.eventos e
set categorias = sub.cats
from (
  select
    ev.id,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', gen_random_uuid()::text,
          'titulo', 'Dia ' || dia_grp.dia,
          'sessoes', dia_grp.sessoes
        )
        order by dia_grp.dia
      ),
      '[]'::jsonb
    ) as cats
  from public.eventos ev
  cross join lateral (
    select
      coalesce(s->>'dia', '') as dia,
      jsonb_agg(s order by s->>'hora_inicio') as sessoes
    from jsonb_array_elements(ev.sessoes) as s
    group by coalesce(s->>'dia', '')
  ) as dia_grp
  where jsonb_array_length(ev.sessoes) > 0
  group by ev.id
) as sub
where e.id = sub.id;

alter table public.eventos drop column if exists sessoes;
