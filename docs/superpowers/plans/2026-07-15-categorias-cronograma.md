# Categorias no cronograma — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o agrupamento automático por dia por **categorias nomeadas e livres**: o cronograma vira `eventos.categorias` (cada categoria = título + sessões), a sessão mantém `dia` opcional, e todas as telas (form, pública, inscrição, ingresso, relatório) passam a agrupar por categoria.

**Architecture:** `eventos.categorias jsonb` substitui `eventos.sessoes`. `Categoria { id, titulo, sessoes: Sessao[] }`. `Sessao` mantém todos os campos (inclui `dia: string | null` opcional). Helper `todasSessoes(categorias)` achata para contagem/validação de vaga. Migração converte dados existentes (1 dia → 1 categoria) antes de dropar a coluna antiga.

**Tech Stack:** Next.js 14 (App Router), Supabase, Tailwind, Vitest.

## Global Constraints

- UI/microcopy em **pt-BR**.
- Verificação: `npm run test` (vitest) + `npm run build`. Migration no Supabase e smoke de browser são do usuário.
- **Sem trailer `Co-Authored-By`** nos commits.
- `Categoria { id: string (crypto.randomUUID()), titulo: string, sessoes: Sessao[] }`.
- `Sessao { id, dia: string | null, hora_inicio, hora_fim, titulo, tipo, tipo_outro: string|null, palestrante: string|null, local: string|null, vagas_max: number|null }` — `dia` opcional.
- Categoria é livre (pode cruzar dias); exibição por categoria, na ordem do array; sessão mostra data quando `dia` presente.
- `inscricoes_sessoes.sessao_id` inalterado — marcações existentes continuam válidas.
- Migração destrutiva (`drop column sessoes`): converter ANTES do drop, na mesma migration.
- Não expor service_role no browser. Atualizar skill `creden-supabase`.

---

## File Structure

- `supabase/migrations/005_categorias.sql` — **criar**. Coluna `categorias` + conversão + drop `sessoes`.
- `supabase/schema.sql` — **modificar**. `categorias` no lugar de `sessoes`.
- `types/index.ts` — **modificar**. `Categoria`; `Evento.categorias` (remove `sessoes`).
- `lib/sessoes.ts` — **modificar**. Remove `agruparPorDia`/`parseSessoes`; add `novaCategoria`, `parseCategorias`, `todasSessoes`; `novaSessao` ganha `dia:''`.
- `lib/sessoes.test.ts` — **modificar**. Remove testes de `agruparPorDia`; add `novaCategoria`/`parseCategorias`/`todasSessoes`.
- `lib/marcacoes.ts` — **modificar**. Funções recebem `categorias` + usam `todasSessoes`.
- `app/eventos/EventoForm.tsx` — **modificar**. Bloco de dois níveis (categoria → sessões).
- `app/eventos/novo/actions.ts` — **modificar**. Grava `categorias`.
- `app/eventos/[id]/editar/payload.ts` — **modificar**. `categorias` no payload.
- `app/eventos/[id]/editar/actions.ts` — **modificar**. `limparOrfaos(..., payload.categorias)`.
- `app/eventos/[id]/editar/actions.test.ts` — **modificar**. Teste do parse de categorias.
- `components/Cronograma.tsx` — **modificar**. Agrupa por categoria; data opcional.
- `app/e/[slug]/page.tsx` — **modificar**. Passa `ev.categorias`.
- `app/e/[slug]/inscricao/page.tsx` + `InscricaoForm.tsx` + `actions.ts` — **modificar**. Checkboxes por categoria; `evento.categorias`.
- `app/i/[token]/page.tsx` + `SessoesEditor.tsx` + `actions.ts` — **modificar**. Editor por categoria; `evento.categorias`.
- `app/eventos/[id]/sessoes/page.tsx` — **modificar**. Relatório por categoria.
- `.claude/skills/creden-supabase/SKILL.md` — **modificar**. Documentar `categorias`.

---

## Task 1: Schema + tipos + migração

**Files:**
- Create: `supabase/migrations/005_categorias.sql`
- Modify: `supabase/schema.sql`, `types/index.ts`

**Interfaces:**
- Produces: `eventos.categorias jsonb`; tipos `Categoria`, `Sessao` (com `dia: string | null`), `Evento.categorias: Categoria[]` (sem `sessoes`).

- [ ] **Step 1: Migration**

Create `supabase/migrations/005_categorias.sql`:

```sql
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
```

- [ ] **Step 2: schema.sql**

Modify `supabase/schema.sql`: trocar a linha `sessoes jsonb not null default '[]'::jsonb` por `categorias jsonb not null default '[]'::jsonb` no create table eventos.

- [ ] **Step 3: Tipos**

Modify `types/index.ts`. Ajustar `Sessao` (add `dia: string | null` se não estiver com esse tipo — hoje é `string`; tornar `string | null`), adicionar `Categoria`, trocar `Evento.sessoes` por `Evento.categorias`:

```ts
export interface Sessao {
  id: string
  dia: string | null
  hora_inicio: string
  hora_fim: string
  titulo: string
  tipo: TipoSessao
  tipo_outro: string | null
  palestrante: string | null
  local: string | null
  vagas_max: number | null
}

export interface Categoria {
  id: string
  titulo: string
  sessoes: Sessao[]
}
```

Em `Evento`: remover `sessoes: Sessao[]`, adicionar `categorias: Categoria[]`.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: FALHA esperada de tipos nos arquivos que ainda usam `.sessoes`/`agruparPorDia` — isso confirma o alcance. NÃO corrigir aqui (as próximas tasks corrigem). Se preferir gate verde, este build só valida `types/index.ts` isoladamente via `npx tsc --noEmit` no arquivo — mas como o projeto compila tudo, aceite que o build fica vermelho até a Task 5. Documentar no report os arquivos que quebraram (devem bater com a File Structure).

NOTA ao implementer: esta é a única task cujo build fica vermelho por design (a coluna/tipo mudam antes dos consumidores). Não é motivo de BLOCKED. Commit mesmo assim.

- [ ] **Step 5: Aplicar migration** (usuário) — rodar `005_categorias.sql` no Supabase; conferir que `eventos.categorias` populou e `sessoes` sumiu.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/005_categorias.sql supabase/schema.sql types/index.ts
git commit -m "feat: schema de categorias no cronograma (substitui sessoes)"
```

---

## Task 2: Helpers (lib/sessoes.ts)

**Files:**
- Modify: `lib/sessoes.ts`, `lib/sessoes.test.ts`

**Interfaces:**
- Consumes: `Sessao`, `Categoria`, `TipoSessao` de `@/types`.
- Produces:
  - `novaSessao(): Sessao` (com `dia: ''`)
  - `novaCategoria(): Categoria`
  - `rotuloTipo` (inalterado)
  - `parseCategorias(json: string): Categoria[]`
  - `todasSessoes(categorias: Categoria[]): Sessao[]`
  - (remove `agruparPorDia`, `parseSessoes`)

- [ ] **Step 1: Ajustar testes**

Modify `lib/sessoes.test.ts`: remover o `describe('agruparPorDia')` e o import dele. Ajustar o helper `s()` para incluir `dia` (pode ser `null`). Adicionar:

```ts
import { novaSessao, rotuloTipo, parseCategorias, novaCategoria, todasSessoes } from './sessoes'
import type { Categoria } from '@/types'

describe('novaCategoria', () => {
  it('gera id único e título vazio com sessoes []', () => {
    const a = novaCategoria()
    const b = novaCategoria()
    expect(a.id).not.toBe(b.id)
    expect(a.titulo).toBe('')
    expect(a.sessoes).toEqual([])
  })
})

describe('parseCategorias', () => {
  it('parseia array válido', () => {
    const arr = parseCategorias(JSON.stringify([{ id: 'c1', titulo: 'Dia 1', sessoes: [] }]))
    expect(arr).toHaveLength(1)
    expect(arr[0].titulo).toBe('Dia 1')
  })
  it('retorna [] em JSON inválido/não-array', () => {
    expect(parseCategorias('{{')).toEqual([])
    expect(parseCategorias('')).toEqual([])
    expect(parseCategorias('{"a":1}')).toEqual([])
  })
})

describe('todasSessoes', () => {
  it('achata as sessões de todas as categorias', () => {
    const cats: Categoria[] = [
      { id: 'c1', titulo: 'A', sessoes: [s({ id: 's1' }), s({ id: 's2' })] },
      { id: 'c2', titulo: 'B', sessoes: [s({ id: 's3' })] },
    ]
    expect(todasSessoes(cats).map((x) => x.id)).toEqual(['s1', 's2', 's3'])
    expect(todasSessoes([])).toEqual([])
  })
})
```

(O helper `s()` já existe no arquivo — garantir que ele fornece `dia`.)

- [ ] **Step 2: Rodar — falha**

Run: `npm run test`
Expected: FAIL (parseCategorias/novaCategoria/todasSessoes não existem; agruparPorDia removido do import).

- [ ] **Step 3: Implementar**

Modify `lib/sessoes.ts`. `novaSessao` mantém `dia: ''`. Remover `agruparPorDia` e `parseSessoes`. Adicionar:

```ts
import type { Sessao, TipoSessao, Categoria } from '@/types'

/** Nova categoria vazia para o form. */
export function novaCategoria(): Categoria {
  return { id: crypto.randomUUID(), titulo: '', sessoes: [] }
}

/** Parseia o jsonb de categorias vindo do FormData; [] em qualquer erro. */
export function parseCategorias(json: string): Categoria[] {
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? (v as Categoria[]) : []
  } catch {
    return []
  }
}

/** Achata todas as sessões de todas as categorias (ordem do array). */
export function todasSessoes(categorias: Categoria[]): Sessao[] {
  return categorias.flatMap((c) => c.sessoes ?? [])
}
```

- [ ] **Step 4: Rodar — passa**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/sessoes.ts lib/sessoes.test.ts
git commit -m "feat: helpers de categoria (novaCategoria, parseCategorias, todasSessoes); remove agruparPorDia"
```

---

## Task 3: Marcações (lib/marcacoes.ts)

**Files:**
- Modify: `lib/marcacoes.ts`

**Interfaces:**
- Consumes: `Categoria`, `Sessao` de `@/types`; `todasSessoes` de `@/lib/sessoes`.
- Produces (assinaturas trocam `sessoes: Sessao[]` por `categorias: Categoria[]`):
  - `idsDeSessoes(categorias: Categoria[]): string[]`
  - `limparOrfaos(admin, eventoId, categorias: Categoria[])`
  - `gravarMarcacoes(admin, eventoId, inscricaoId, sessaoIds, categorias: Categoria[])`
  - `reconciliarMarcacoes(admin, eventoId, inscricaoId, desejadas, categorias: Categoria[])`
  - `contarPorSessao`, `marcacoesDaInscricao` — inalteradas.

- [ ] **Step 1: Ajustar as funções**

Modify `lib/marcacoes.ts`. Import `todasSessoes`:

```ts
import { todasSessoes } from '@/lib/sessoes'
import type { Sessao, Categoria } from '@/types'
```

- `idsDeSessoes(categorias: Categoria[])`: `return todasSessoes(categorias).map((s) => s.id)`.
- `limparOrfaos(admin, eventoId, categorias: Categoria[])`: trocar o parâmetro; `const validos = idsDeSessoes(categorias)` (resto igual).
- `gravarMarcacoes(admin, eventoId, inscricaoId, sessaoIds, categorias: Categoria[])`: `const porId = new Map(todasSessoes(categorias).map((s) => [s.id, s]))` (resto igual, incluindo o dedup e log de erro já existentes).
- `reconciliarMarcacoes(admin, eventoId, inscricaoId, desejadas, categorias: Categoria[])`: repassar `categorias` ao `gravarMarcacoes`.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: ainda vermelho (consumidores nas telas ainda passam `.sessoes`), mas `lib/marcacoes.ts` em si compila. Se `npm run test` cobrir só puros, rodar test → PASS. Documentar no report que o build fica verde só após Task 5.

- [ ] **Step 3: Commit**

```bash
git add lib/marcacoes.ts
git commit -m "feat: funcoes de marcacao operam sobre categorias (via todasSessoes)"
```

---

## Task 4: Form do organizador (EventoForm + actions + payload)

**Files:**
- Modify: `app/eventos/EventoForm.tsx`, `app/eventos/novo/actions.ts`, `app/eventos/[id]/editar/payload.ts`, `app/eventos/[id]/editar/actions.ts`, `app/eventos/[id]/editar/actions.test.ts`

**Interfaces:**
- Consumes: `novaCategoria`, `novaSessao`, `parseCategorias` de `@/lib/sessoes`; `Categoria`, `Sessao`, `TipoSessao`.
- Produces: eventos criados/editados persistem `categorias`.

- [ ] **Step 1: EventoForm — estado de categorias e bloco de dois níveis**

Modify `app/eventos/EventoForm.tsx`. LER o arquivo inteiro primeiro. Trocar o estado/bloco de `sessoes` por `categorias`:

- import: `import { novaCategoria, novaSessao } from '@/lib/sessoes'` e `Categoria, Sessao, TipoSessao` de `@/types`.
- estado: `const [categorias, setCategorias] = useState<Categoria[]>(evento?.categorias ?? [])`.
- handlers:

```tsx
  function atualizarCategoria(id: string, patch: Partial<Categoria>) {
    setCategorias((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }
  function addSessao(catId: string) {
    setCategorias((cs) =>
      cs.map((c) => (c.id === catId ? { ...c, sessoes: [...c.sessoes, novaSessao()] } : c))
    )
  }
  function atualizarSessao(catId: string, sid: string, patch: Partial<Sessao>) {
    setCategorias((cs) =>
      cs.map((c) =>
        c.id === catId
          ? { ...c, sessoes: c.sessoes.map((s) => (s.id === sid ? { ...s, ...patch } : s)) }
          : c
      )
    )
  }
  function removerSessao(catId: string, sid: string) {
    setCategorias((cs) =>
      cs.map((c) => (c.id === catId ? { ...c, sessoes: c.sessoes.filter((s) => s.id !== sid) } : c))
    )
  }
```

- em `enviar`, trocar `formData.set('sessoes', ...)` por `formData.set('categorias', JSON.stringify(categorias))`.
- o card "Programação" vira: botão "＋ Adicionar categoria" (`setCategorias((cs) => [...cs, novaCategoria()])`); para cada categoria, um input de título + botão remover categoria; dentro, a lista de sessões (os mesmos inputs de hoje — dia (date, opcional), hora início/fim, título, tipo, tipo_outro condicional, palestrante, local, vagas_max) com os handlers acima; botão "＋ Adicionar sessão" por categoria. Bloco completo:

```tsx
        <div className="card p-[22px]">
          <h2 className="text-lg font-semibold">Programação</h2>
          <p className="text-xs text-muted mt-1 mb-4">
            Organize em categorias (ex: "Dia 01 — Gestão Municipal"). Uma categoria pode ter sessões de dias diferentes.
          </p>
          {categorias.map((c) => (
            <div key={c.id} className="border border-line rounded-md p-3 mb-4 grid gap-3">
              <div className="flex gap-2.5 items-center">
                <input
                  className="input flex-1 font-semibold"
                  placeholder="Título da categoria (ex: Dia 01 (10/08) — Gestão Municipal)"
                  value={c.titulo}
                  onChange={(e) => atualizarCategoria(c.id, { titulo: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setCategorias((cs) => cs.filter((x) => x.id !== c.id))}
                  className="text-muted hover:text-error px-1.5 text-lg"
                  aria-label="Remover categoria"
                >
                  ✕
                </button>
              </div>
              {c.sessoes.map((s) => (
                <div key={s.id} className="border border-line rounded-md p-3 grid gap-2.5 bg-sand">
                  <div className="flex gap-2.5 items-center">
                    <input
                      className="input flex-1"
                      placeholder="Título da sessão"
                      value={s.titulo}
                      onChange={(e) => atualizarSessao(c.id, s.id, { titulo: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => removerSessao(c.id, s.id)}
                      className="text-muted hover:text-error px-1.5 text-lg"
                      aria-label="Remover sessão"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5 max-[860px]:grid-cols-1">
                    <input
                      type="date"
                      className="input"
                      value={s.dia ?? ''}
                      onChange={(e) => atualizarSessao(c.id, s.id, { dia: e.target.value || null })}
                    />
                    <input
                      type="time"
                      className="input"
                      value={s.hora_inicio}
                      onChange={(e) => atualizarSessao(c.id, s.id, { hora_inicio: e.target.value })}
                    />
                    <input
                      type="time"
                      className="input"
                      value={s.hora_fim}
                      onChange={(e) => atualizarSessao(c.id, s.id, { hora_fim: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 max-[860px]:grid-cols-1">
                    <select
                      className="input"
                      value={s.tipo}
                      onChange={(e) => atualizarSessao(c.id, s.id, { tipo: e.target.value as TipoSessao })}
                    >
                      <option value="palestra">Palestra</option>
                      <option value="minicurso">Minicurso</option>
                      <option value="servico">Serviço</option>
                      <option value="outro">Outro</option>
                    </select>
                    {s.tipo === 'outro' ? (
                      <input
                        className="input"
                        placeholder="Nome do tipo (ex: Mesa redonda)"
                        value={s.tipo_outro ?? ''}
                        onChange={(e) => atualizarSessao(c.id, s.id, { tipo_outro: e.target.value || null })}
                      />
                    ) : (
                      <div />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 max-[860px]:grid-cols-1">
                    <input
                      className="input"
                      placeholder="Palestrante (opcional)"
                      value={s.palestrante ?? ''}
                      onChange={(e) => atualizarSessao(c.id, s.id, { palestrante: e.target.value || null })}
                    />
                    <input
                      className="input"
                      placeholder="Local/sala (opcional)"
                      value={s.local ?? ''}
                      onChange={(e) => atualizarSessao(c.id, s.id, { local: e.target.value || null })}
                    />
                  </div>
                  <input
                    type="number"
                    min={1}
                    className="input"
                    placeholder="Vagas (deixe vazio p/ ilimitado)"
                    value={s.vagas_max ?? ''}
                    onChange={(e) =>
                      atualizarSessao(c.id, s.id, { vagas_max: e.target.value ? Number(e.target.value) : null })
                    }
                  />
                </div>
              ))}
              <Button type="button" variant="ghost" onClick={() => addSessao(c.id)}>
                ＋ Adicionar sessão
              </Button>
            </div>
          ))}
          <Button type="button" variant="ghost" onClick={() => setCategorias((cs) => [...cs, novaCategoria()])}>
            ＋ Adicionar categoria
          </Button>
        </div>
```

- [ ] **Step 2: criarEvento**

Modify `app/eventos/novo/actions.ts`. Trocar import `parseSessoes` por `parseCategorias`; no insert, `categorias: parseCategorias(String(formData.get('categorias') ?? '[]'))` no lugar de `sessoes: parseSessoes(...)`.

- [ ] **Step 3: payload (editar)**

Modify `app/eventos/[id]/editar/payload.ts`: `import { parseCategorias }`; `Categoria` no lugar de `Sessao`; `categorias: Categoria[]` na interface; `categorias: parseCategorias(String(formData.get('categorias') ?? '[]'))` no retorno.

- [ ] **Step 4: editar actions — limparOrfaos**

Modify `app/eventos/[id]/editar/actions.ts`: a chamada `limparOrfaos(createAdminSupabase(), eventoId, payload.sessoes)` vira `payload.categorias`.

- [ ] **Step 5: teste do payload**

Modify `app/eventos/[id]/editar/actions.test.ts`: onde havia asserção/uso de `sessoes`, trocar por `categorias`. Adicionar caso: FormData com `categorias` JSON válido → `payload.categorias` parseado; ausente → `[]`.

- [ ] **Step 6: Testes + build**

Run: `npm run test` — Expected: PASS.
Run: `npm run build` — Expected: ainda pode faltar telas (Task 5); documentar. `EventoForm`/actions em si compilam.

- [ ] **Step 7: Commit**

```bash
git add app/eventos/EventoForm.tsx app/eventos/novo/actions.ts "app/eventos/[id]/editar/payload.ts" "app/eventos/[id]/editar/actions.ts" "app/eventos/[id]/editar/actions.test.ts"
git commit -m "feat: form de programacao em dois niveis (categoria > sessoes); grava categorias"
```

---

## Task 5: Render em todas as telas (fecha o build)

**Files:**
- Modify: `components/Cronograma.tsx`, `app/e/[slug]/page.tsx`, `app/e/[slug]/inscricao/page.tsx`, `app/e/[slug]/inscricao/InscricaoForm.tsx`, `app/e/[slug]/inscricao/actions.ts`, `app/i/[token]/page.tsx`, `app/i/[token]/SessoesEditor.tsx`, `app/i/[token]/actions.ts`, `app/eventos/[id]/sessoes/page.tsx`

**Interfaces:**
- Consumes: `Categoria`, `rotuloTipo`, `todasSessoes`; funções de `marcacoes` (agora com `categorias`).
- Produces: build verde; todas as telas agrupam por categoria.

- [ ] **Step 1: Cronograma.tsx**

Modify `components/Cronograma.tsx`. Trocar prop `sessoes` por `categorias: Categoria[]`. Remover uso de `agruparPorDia`. Iterar categorias na ordem; para cada, `titulo` como cabeçalho e `c.sessoes` como itens. No horário, se `s.dia`, prefixar a data formatada (`formatarDia` local — recebe 'YYYY-MM-DD', retorna 'dd/mm'):

```tsx
import { Categoria } from '@/types'
import { rotuloTipo } from '@/lib/sessoes'

function formatarDia(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function Cronograma({
  categorias,
  contagens,
}: {
  categorias: Categoria[]
  contagens?: Record<string, number>
}) {
  if (!categorias || categorias.length === 0) return null
  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl font-semibold mb-4">Programação</h2>
      <div className="grid gap-6">
        {categorias.map((c) => (
          <div key={c.id}>
            <h3 className="font-display text-lg font-semibold text-primary">{c.titulo}</h3>
            <div className="grid gap-2.5 mt-3">
              {c.sessoes.map((s) => {
                const usadas = contagens?.[s.id] ?? 0
                const lotada = s.vagas_max != null && usadas >= s.vagas_max
                return (
                  <div key={s.id} className="card p-4 flex gap-4 items-start">
                    <div className="text-sm font-semibold text-secondary whitespace-nowrap">
                      {s.dia ? `${formatarDia(s.dia)} · ` : ''}
                      {s.hora_inicio}
                      {s.hora_fim ? `–${s.hora_fim}` : ''}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="badge badge-inscrito">{rotuloTipo(s)}</span>
                        {s.vagas_max != null && (
                          <span className={`text-xs ${lotada ? 'text-error' : 'text-muted'}`}>
                            {lotada ? 'Vagas esgotadas' : `${usadas} de ${s.vagas_max} vagas`}
                          </span>
                        )}
                      </div>
                      <div className="font-semibold mt-1">{s.titulo}</div>
                      {s.palestrante && <div className="text-sm text-muted">{s.palestrante}</div>}
                      {s.local && <div className="text-xs text-muted">📍 {s.local}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: página pública**

Modify `app/e/[slug]/page.tsx`: `<Cronograma categorias={ev.categorias} contagens={await contarPorSessao(createAdminSupabase(), ev.id)} />` (trocar `sessoes={ev.sessoes}` por `categorias={ev.categorias}`).

- [ ] **Step 3: inscrição (page + form + action)**

Modify `app/e/[slug]/inscricao/page.tsx`: passar `categorias={evento.categorias}` ao `InscricaoForm` (no lugar de `sessoes`).

Modify `InscricaoForm.tsx`: prop `categorias: Categoria[]` (remove `sessoes`); remover `agruparPorDia`; iterar `categorias` → para cada, cabeçalho do título + checkboxes das `c.sessoes` (mesma lógica de lotada/checked de hoje, usando `contagens`). Mostrar data na label da sessão quando `s.dia`.

Modify `app/e/[slug]/inscricao/actions.ts`: onde passava `evento.sessoes` a `gravarMarcacoes`, passar `evento.categorias`.

- [ ] **Step 4: ingresso (page + editor + action)**

Modify `app/i/[token]/SessoesEditor.tsx`: prop `categorias: Categoria[]`; remover `agruparPorDia`; iterar categorias com cabeçalho + checkboxes.

Modify `app/i/[token]/page.tsx`: passar `categorias={ev.categorias}` (no lugar de `sessoes`); a condição de render passa a `ev.categorias.length > 0`.

Modify `app/i/[token]/actions.ts`: `reconciliarMarcacoes(..., row.eventos.categorias)` no lugar de `.sessoes`.

- [ ] **Step 5: relatório**

Modify `app/eventos/[id]/sessoes/page.tsx`: remover `agruparPorDia`; iterar `ev.categorias` → cabeçalho do título + para cada sessão, contagem + lista de quem marcou (o map `porSessao` por `sessao_id` continua igual). Data na linha da sessão quando `s.dia`.

- [ ] **Step 6: Testes + build (agora verde)**

Run: `npm run test` — Expected: PASS.
Run: `npm run build` — Expected: **verde** (todos os consumidores migrados). Se cache `.next`, `rm -rf .next` e refazer.

- [ ] **Step 7: Commit**

```bash
git add components/Cronograma.tsx "app/e/[slug]/page.tsx" "app/e/[slug]/inscricao/" "app/i/[token]/" "app/eventos/[id]/sessoes/page.tsx"
git commit -m "feat: todas as telas do cronograma agrupam por categoria"
```

---

## Task 6: Skill + SQL de renomear categorias do evento real

**Files:**
- Modify: `.claude/skills/creden-supabase/SKILL.md`

**Interfaces:**
- Produces: skill atualizada; SQL opcional (no report) para renomear as categorias do evento I Semana Acadêmica.

- [ ] **Step 1: Skill**

Modify `.claude/skills/creden-supabase/SKILL.md`: trocar a menção a `sessoes jsonb` por `categorias jsonb` no modelo de `eventos`, descrevendo a estrutura `categorias[] { id, titulo, sessoes[] }` (sessão com `dia` opcional). Ajustar qualquer texto que descreva o cronograma por dia.

- [ ] **Step 2: SQL opcional de renome (no report, não commit)**

Escrever no report um UPDATE opcional que renomeia as categorias do evento
`i-semana-academica-gestao-hospitalar` (geradas como "Dia 2026-08-10" etc. pela
conversão) para os temas das fotos:
- "Dia 01 (10/08) — Gestão Municipal e Políticas Públicas"
- "Dia 02 (11/08) — Qualidade, Eficiência e Segurança na Gestão em Saúde"
- "Dia 03 (12/08) — Prática, Inovação e Ações SEMSA/SENAC"

O UPDATE ajusta `titulo` de cada objeto do array `categorias` por posição/ordem.
Fornecer como sugestão para o usuário rodar no Supabase (não é código do app).

- [ ] **Step 3: Build + commit**

Run: `npm run build` — Expected: verde.

```bash
git add .claude/skills/creden-supabase/SKILL.md
git commit -m "docs: skill reflete categorias no cronograma"
```

---

## Self-Review

- **Cobertura do spec:** coluna/migração/tipos (T1) ✓; helpers novos + remoção de agruparPorDia (T2) ✓; marcações sobre categorias (T3) ✓; form dois níveis + actions (T4) ✓; render em todas as telas + build verde (T5) ✓; skill + renome do evento (T6) ✓. `dia` opcional coberto no tipo (T1), form (T4), render (T5). Migração destrutiva com conversão-antes-do-drop (T1) ✓.
- **Placeholders:** as instruções "LER o arquivo primeiro" são de integração (casar texto real), acompanhadas do código concreto a inserir. Sem TBD de lógica.
- **Consistência de tipos:** `Categoria`/`Sessao` (com `dia: string | null`) definidos em T1, usados igual em T2-T6. `parseCategorias`/`novaCategoria`/`todasSessoes` (T2) consumidos com as mesmas assinaturas em T3-T5. Funções de marcação recebem `categorias: Categoria[]` (T3) e são chamadas assim em T4/T5.
- **Build vermelho intencional:** T1-T4 podem deixar o build vermelho (coluna/tipo mudam antes dos consumidores); T5 fecha verde. Documentado em cada task — não é BLOCKED. `npm run test` (puros) permanece verde a cada passo onde há teste.
- **Marcações preservadas:** `sessao_id` (id da sessão) sobrevive à migração e à mudança de estrutura; `inscricoes_sessoes` intacta.
