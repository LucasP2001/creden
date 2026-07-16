# Cronograma + inscrição em sessões — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eventos ganham uma programação (sessões: palestras/minicursos/serviços) que o participante vê e marca interesse por sessão — na inscrição e depois pelo ingresso — com vaga por sessão, e um relatório de marcações para o organizador.

**Architecture:** Cronograma em `eventos.sessoes` (jsonb, padrão de `campos_extras`). Marcações em tabela nova `inscricoes_sessoes` (conta vaga, lista quem marcou). Front reusa os padrões existentes (bloco de campos_extras no `EventoForm`, checkboxes na inscrição, service_role no ingresso).

**Tech Stack:** Next.js 14 (App Router), Supabase (`@supabase/ssr` + `@supabase/supabase-js`), Tailwind, Vitest.

## Global Constraints

- UI e microcopy em **pt-BR**.
- Verificação: `npm run test` (vitest) + `npm run build`. Migration no Supabase e smoke de browser são do usuário.
- **Sem trailer `Co-Authored-By`** nas mensagens de commit.
- Cronograma em `eventos.sessoes jsonb default '[]'`. Marcações em `inscricoes_sessoes` (unique `(inscricao_id, sessao_id)`).
- Sessão: `{ id, dia 'YYYY-MM-DD', hora_inicio 'HH:MM', hora_fim 'HH:MM', titulo, tipo: 'palestra'|'minicurso'|'servico'|'outro', tipo_outro: string|null, palestrante: string|null, local: string|null, vagas_max: number|null }`. `id` via `crypto.randomUUID()`.
- `tipo === 'outro'` → campo de texto `tipo_outro` para rótulo livre; badge usa `tipo_outro` se presente.
- Vaga por sessão validada **no servidor** no momento do envio (rejeita sessão lotada com aviso). Sem lock pesado. Sem bloqueio de conflito de horário.
- Marcar na inscrição **e** editar depois pelo ingresso (`/i/[token]`, via service_role por token).
- Ao editar o evento, apagar marcações cujo `sessao_id` não existe mais no jsonb (limpeza de órfãos).
- RLS `inscricoes_sessoes`: insert anônimo; select/delete só pelo dono do evento. Participante lê/edita via service_role por token.
- Não expor `service_role` no browser.
- Atualizar a skill `creden-supabase` ao decidir schema (exigência do CLAUDE.md).

---

## File Structure

- `supabase/migrations/004_sessoes.sql` — **criar**. Coluna `sessoes` + tabela `inscricoes_sessoes` + índices + RLS.
- `supabase/schema.sql` — **modificar**. Refletir coluna e tabela.
- `types/index.ts` — **modificar**. `Sessao`, `TipoSessao`, `Evento.sessoes`.
- `lib/sessoes.ts` — **criar**. Helpers puros: `novaSessao()`, `rotuloTipo()`, `agruparPorDia()`, `parseSessoes()`. Testável.
- `lib/sessoes.test.ts` — **criar**. Testes dos helpers.
- `app/eventos/EventoForm.tsx` — **modificar**. Bloco "Programação".
- `app/eventos/novo/actions.ts` — **modificar**. Gravar `sessoes` no insert.
- `app/eventos/[id]/editar/payload.ts` — **modificar**. Gravar `sessoes` + limpar órfãos (via helper).
- `app/eventos/[id]/editar/actions.ts` — **modificar**. Chamar limpeza de órfãos após update.
- `components/Cronograma.tsx` — **criar**. Exibição read-only agrupada por dia (server component). Reusado na pública.
- `app/e/[slug]/page.tsx` — **modificar**. Seção "Programação".
- `app/e/[slug]/inscricao/InscricaoForm.tsx` — **modificar**. Checkboxes de sessão.
- `app/e/[slug]/inscricao/page.tsx` — **modificar**. Passar sessões + contagens ao form.
- `app/e/[slug]/inscricao/actions.ts` — **modificar**. Gravar marcações com validação de vaga.
- `lib/marcacoes.ts` — **criar**. `gravarMarcacoes(admin, eventoId, inscricaoId, sessaoIds)` + `contarPorSessao(admin, eventoId)` — lógica de vaga compartilhada entre inscrição e ingresso.
- `app/i/[token]/page.tsx` — **modificar**. Seção "Minhas sessões".
- `app/i/[token]/SessoesEditor.tsx` — **criar**. Client: checkboxes editáveis.
- `app/i/[token]/actions.ts` — **modificar/criar**. `atualizarSessoes(token, sessaoIds)`.
- `app/eventos/[id]/sessoes/page.tsx` — **criar**. Relatório por sessão (guarda de dono).
- `components/EventCard.tsx` — **modificar**. Link "Programação"/"Sessões".
- `.claude/skills/creden-supabase/SKILL.md` — **modificar**. Documentar.

---

## Task 1: Schema + tipos

**Files:**
- Create: `supabase/migrations/004_sessoes.sql`
- Modify: `supabase/schema.sql` (após bloco inscricoes e nas policies)
- Modify: `types/index.ts`

**Interfaces:**
- Produces: `eventos.sessoes jsonb`; tabela `inscricoes_sessoes`; tipos `Sessao`, `TipoSessao`, `Evento.sessoes: Sessao[]`.

- [ ] **Step 1: Migration**

Create `supabase/migrations/004_sessoes.sql`:

```sql
-- 004_sessoes.sql — cronograma (sessoes) + marcacoes de interesse por sessao.

-- Cronograma do evento (array de sessoes)
alter table public.eventos
  add column if not exists sessoes jsonb not null default '[]'::jsonb;

-- Marcacoes: uma linha por (inscricao, sessao)
create table if not exists public.inscricoes_sessoes (
  id            uuid primary key default gen_random_uuid(),
  inscricao_id  uuid not null references public.inscricoes (id) on delete cascade,
  evento_id     uuid not null references public.eventos (id) on delete cascade,
  sessao_id     text not null,
  created_at    timestamptz not null default now(),
  unique (inscricao_id, sessao_id)
);

create index if not exists inscricoes_sessoes_evento_idx
  on public.inscricoes_sessoes (evento_id);
create index if not exists inscricoes_sessoes_sessao_idx
  on public.inscricoes_sessoes (evento_id, sessao_id);

alter table public.inscricoes_sessoes enable row level security;

-- Insert anonimo (participante marca ao se inscrever na pagina publica)
drop policy if exists "inscricoes_sessoes: insert publico" on public.inscricoes_sessoes;
create policy "inscricoes_sessoes: insert publico" on public.inscricoes_sessoes
  for insert to anon, authenticated with check (true);

-- Leitura so pelo dono do evento (relatorio)
drop policy if exists "inscricoes_sessoes: dono le" on public.inscricoes_sessoes;
create policy "inscricoes_sessoes: dono le" on public.inscricoes_sessoes
  for select using (
    exists (select 1 from public.eventos e
            where e.id = inscricoes_sessoes.evento_id and e.user_id = auth.uid())
  );

-- Delete so pelo dono (limpeza; participante edita via service_role por token)
drop policy if exists "inscricoes_sessoes: dono apaga" on public.inscricoes_sessoes;
create policy "inscricoes_sessoes: dono apaga" on public.inscricoes_sessoes
  for delete using (
    exists (select 1 from public.eventos e
            where e.id = inscricoes_sessoes.evento_id and e.user_id = auth.uid())
  );
```

- [ ] **Step 2: Refletir no schema.sql**

Modify `supabase/schema.sql`: no `create table ... eventos`, após `campos_extras jsonb ...`, adicionar:

```sql
  sessoes       jsonb not null default '[]'::jsonb, -- cronograma (ver skill creden-supabase)
```

E ao fim do arquivo (após as policies de inscricoes), colar o bloco `create table public.inscricoes_sessoes ...` + índices + RLS idêntico ao da migration (sem `if not exists` nas policies não é necessário — manter o mesmo SQL da migration para consistência).

- [ ] **Step 3: Tipos**

Modify `types/index.ts`. Adicionar antes de `interface Evento`:

```ts
export type TipoSessao = 'palestra' | 'minicurso' | 'servico' | 'outro'

export interface Sessao {
  id: string
  dia: string // 'YYYY-MM-DD'
  hora_inicio: string // 'HH:MM'
  hora_fim: string // 'HH:MM'
  titulo: string
  tipo: TipoSessao
  tipo_outro: string | null // rótulo livre quando tipo === 'outro'
  palestrante: string | null
  local: string | null
  vagas_max: number | null // null = ilimitado
}
```

E dentro de `interface Evento`, após `campos_extras: CampoExtra[]`:

```ts
  sessoes: Sessao[] // cronograma (jsonb no banco)
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: passa (tipos novos compilam; nada usa ainda).

- [ ] **Step 5: Aplicar migration** (usuário)

Rodar `004_sessoes.sql` no SQL Editor do Supabase. Verificar: coluna `eventos.sessoes`, tabela `inscricoes_sessoes`, policies.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/004_sessoes.sql supabase/schema.sql types/index.ts
git commit -m "feat: schema de sessoes (cronograma) e inscricoes_sessoes"
```

---

## Task 2: Helpers puros de sessão (lib/sessoes.ts)

**Files:**
- Create: `lib/sessoes.ts`
- Create: `lib/sessoes.test.ts`

**Interfaces:**
- Consumes: `Sessao`, `TipoSessao` de `@/types`.
- Produces:
  - `novaSessao(): Sessao`
  - `rotuloTipo(s: Pick<Sessao, 'tipo' | 'tipo_outro'>): string`
  - `parseSessoes(json: string): Sessao[]`
  - `agruparPorDia(sessoes: Sessao[]): { dia: string; itens: Sessao[] }[]` (dias ordenados asc, itens por `hora_inicio` asc)

- [ ] **Step 1: Testes**

Create `lib/sessoes.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { novaSessao, rotuloTipo, parseSessoes, agruparPorDia } from './sessoes'
import type { Sessao } from '@/types'

function s(over: Partial<Sessao>): Sessao {
  return {
    id: over.id ?? crypto.randomUUID(),
    dia: over.dia ?? '2026-08-10',
    hora_inicio: over.hora_inicio ?? '08:00',
    hora_fim: over.hora_fim ?? '09:00',
    titulo: over.titulo ?? 'X',
    tipo: over.tipo ?? 'palestra',
    tipo_outro: over.tipo_outro ?? null,
    palestrante: over.palestrante ?? null,
    local: over.local ?? null,
    vagas_max: over.vagas_max ?? null,
  }
}

describe('novaSessao', () => {
  it('gera id único e defaults vazios', () => {
    const a = novaSessao()
    const b = novaSessao()
    expect(a.id).not.toBe(b.id)
    expect(a.tipo).toBe('palestra')
    expect(a.tipo_outro).toBeNull()
    expect(a.vagas_max).toBeNull()
  })
})

describe('rotuloTipo', () => {
  it('usa rótulo padrão por tipo', () => {
    expect(rotuloTipo({ tipo: 'palestra', tipo_outro: null })).toBe('Palestra')
    expect(rotuloTipo({ tipo: 'minicurso', tipo_outro: null })).toBe('Minicurso')
    expect(rotuloTipo({ tipo: 'servico', tipo_outro: null })).toBe('Serviço')
  })
  it('usa tipo_outro quando tipo é outro e há texto', () => {
    expect(rotuloTipo({ tipo: 'outro', tipo_outro: 'Mesa redonda' })).toBe('Mesa redonda')
  })
  it('cai em "Atividade" quando outro sem texto', () => {
    expect(rotuloTipo({ tipo: 'outro', tipo_outro: null })).toBe('Atividade')
  })
})

describe('parseSessoes', () => {
  it('parseia array válido', () => {
    const arr = parseSessoes(JSON.stringify([s({ titulo: 'A' })]))
    expect(arr).toHaveLength(1)
    expect(arr[0].titulo).toBe('A')
  })
  it('retorna [] em JSON inválido', () => {
    expect(parseSessoes('{{')).toEqual([])
    expect(parseSessoes('')).toEqual([])
  })
  it('retorna [] se não for array', () => {
    expect(parseSessoes('{"a":1}')).toEqual([])
  })
})

describe('agruparPorDia', () => {
  it('agrupa por dia e ordena dias e horários', () => {
    const grupos = agruparPorDia([
      s({ dia: '2026-08-11', hora_inicio: '10:00', titulo: 'B' }),
      s({ dia: '2026-08-10', hora_inicio: '14:00', titulo: 'C' }),
      s({ dia: '2026-08-10', hora_inicio: '08:00', titulo: 'A' }),
    ])
    expect(grupos.map((g) => g.dia)).toEqual(['2026-08-10', '2026-08-11'])
    expect(grupos[0].itens.map((i) => i.titulo)).toEqual(['A', 'C'])
    expect(grupos[1].itens.map((i) => i.titulo)).toEqual(['B'])
  })
})
```

- [ ] **Step 2: Rodar — falha**

Run: `npm run test`
Expected: FAIL (módulo `./sessoes` não existe).

- [ ] **Step 3: Implementar**

Create `lib/sessoes.ts`:

```ts
import type { Sessao, TipoSessao } from '@/types'

const ROTULOS: Record<TipoSessao, string> = {
  palestra: 'Palestra',
  minicurso: 'Minicurso',
  servico: 'Serviço',
  outro: 'Atividade',
}

/** Nova sessão vazia para o form do organizador. */
export function novaSessao(): Sessao {
  return {
    id: crypto.randomUUID(),
    dia: '',
    hora_inicio: '',
    hora_fim: '',
    titulo: '',
    tipo: 'palestra',
    tipo_outro: null,
    palestrante: null,
    local: null,
    vagas_max: null,
  }
}

/** Rótulo de exibição do tipo (usa tipo_outro quando tipo === 'outro'). */
export function rotuloTipo(s: Pick<Sessao, 'tipo' | 'tipo_outro'>): string {
  if (s.tipo === 'outro' && s.tipo_outro && s.tipo_outro.trim()) return s.tipo_outro.trim()
  return ROTULOS[s.tipo]
}

/** Parseia o jsonb de sessões vindo do FormData; [] em qualquer erro. */
export function parseSessoes(json: string): Sessao[] {
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? (v as Sessao[]) : []
  } catch {
    return []
  }
}

/** Agrupa por dia (asc) com itens ordenados por hora_inicio (asc). */
export function agruparPorDia(sessoes: Sessao[]): { dia: string; itens: Sessao[] }[] {
  const mapa = new Map<string, Sessao[]>()
  for (const s of sessoes) {
    const arr = mapa.get(s.dia) ?? []
    arr.push(s)
    mapa.set(s.dia, arr)
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, itens]) => ({
      dia,
      itens: [...itens].sort((x, y) => x.hora_inicio.localeCompare(y.hora_inicio)),
    }))
}
```

- [ ] **Step 4: Rodar — passa**

Run: `npm run test`
Expected: PASS (todos os testes de sessoes).

- [ ] **Step 5: Commit**

```bash
git add lib/sessoes.ts lib/sessoes.test.ts
git commit -m "feat: helpers puros de sessao (novaSessao, rotuloTipo, agruparPorDia, parseSessoes)"
```

---

## Task 3: Bloco Programação no EventoForm + gravar no criar/editar

**Files:**
- Modify: `app/eventos/EventoForm.tsx`
- Modify: `app/eventos/novo/actions.ts`
- Modify: `app/eventos/[id]/editar/payload.ts`

**Interfaces:**
- Consumes: `novaSessao`, `parseSessoes` de `@/lib/sessoes`; `Sessao`, `TipoSessao` de `@/types`.
- Produces: eventos criados/editados persistem `sessoes` no jsonb.

- [ ] **Step 1: Estado + bloco no EventoForm**

Modify `app/eventos/EventoForm.tsx`.

Imports (juntar aos existentes):

```tsx
import { CampoExtra, CampoExtraTipo, Evento, Sessao, TipoSessao } from '@/types'
import { novaSessao } from '@/lib/sessoes'
```

Após a linha `const [campos, setCampos] = useState<CampoExtra[]>(evento?.campos_extras ?? [])`, adicionar:

```tsx
  const [sessoes, setSessoes] = useState<Sessao[]>(evento?.sessoes ?? [])
```

Após `function atualizarCampo(...)`, adicionar:

```tsx
  function atualizarSessao(id: string, patch: Partial<Sessao>) {
    setSessoes((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }
```

Dentro de `enviar`, após `formData.set('campos_extras', JSON.stringify(campos))`:

```tsx
    formData.set('sessoes', JSON.stringify(sessoes))
```

Adicionar um novo card (dentro da coluna esquerda `<div className="grid gap-[18px]">`, após o card de campos do formulário). Bloco completo:

```tsx
        <div className="card p-[22px]">
          <h2 className="text-lg font-semibold">Programação</h2>
          <p className="text-xs text-muted mt-1 mb-4">
            Palestras, minicursos e atividades. O participante pode marcar interesse em cada uma.
          </p>
          {sessoes.map((s) => (
            <div key={s.id} className="border border-line rounded-md p-3 mb-3 grid gap-2.5">
              <div className="flex gap-2.5 items-center">
                <input
                  className="input flex-1"
                  placeholder="Título (ex: Logística e Cadeia de Suprimentos)"
                  value={s.titulo}
                  onChange={(e) => atualizarSessao(s.id, { titulo: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setSessoes((ss) => ss.filter((x) => x.id !== s.id))}
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
                  value={s.dia}
                  onChange={(e) => atualizarSessao(s.id, { dia: e.target.value })}
                />
                <input
                  type="time"
                  className="input"
                  value={s.hora_inicio}
                  onChange={(e) => atualizarSessao(s.id, { hora_inicio: e.target.value })}
                />
                <input
                  type="time"
                  className="input"
                  value={s.hora_fim}
                  onChange={(e) => atualizarSessao(s.id, { hora_fim: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5 max-[860px]:grid-cols-1">
                <select
                  className="input"
                  value={s.tipo}
                  onChange={(e) => atualizarSessao(s.id, { tipo: e.target.value as TipoSessao })}
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
                    onChange={(e) => atualizarSessao(s.id, { tipo_outro: e.target.value || null })}
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
                  onChange={(e) => atualizarSessao(s.id, { palestrante: e.target.value || null })}
                />
                <input
                  className="input"
                  placeholder="Local/sala (opcional)"
                  value={s.local ?? ''}
                  onChange={(e) => atualizarSessao(s.id, { local: e.target.value || null })}
                />
              </div>
              <input
                type="number"
                min={1}
                className="input"
                placeholder="Vagas (deixe vazio p/ ilimitado)"
                value={s.vagas_max ?? ''}
                onChange={(e) =>
                  atualizarSessao(s.id, { vagas_max: e.target.value ? Number(e.target.value) : null })
                }
              />
            </div>
          ))}
          <Button type="button" variant="ghost" onClick={() => setSessoes((ss) => [...ss, novaSessao()])}>
            ＋ Adicionar sessão
          </Button>
        </div>
```

- [ ] **Step 2: Gravar no criar**

Modify `app/eventos/novo/actions.ts`. Import:

```ts
import { parseSessoes } from '@/lib/sessoes'
```

No objeto do `insert`, após `campos_extras: camposExtras,`:

```ts
      sessoes: parseSessoes(String(formData.get('sessoes') ?? '[]')),
```

- [ ] **Step 3: Gravar no editar (payload)**

Modify `app/eventos/[id]/editar/payload.ts`. Import:

```ts
import { parseSessoes } from '@/lib/sessoes'
import { Sessao } from '@/types'
```

Adicionar `sessoes: Sessao[]` à interface `PayloadUpdate`. No objeto de retorno, após `campos_extras: camposExtras,`:

```ts
      sessoes: parseSessoes(String(formData.get('sessoes') ?? '[]')),
```

- [ ] **Step 4: Testes + build**

Run: `npm run test` — Expected: PASS (payload tests continuam válidos; sem asserção do objeto inteiro).
Run: `npm run build` — Expected: passa.

- [ ] **Step 5: Commit**

```bash
git add app/eventos/EventoForm.tsx app/eventos/novo/actions.ts app/eventos/[id]/editar/payload.ts
git commit -m "feat: bloco Programacao no EventoForm; grava sessoes no criar/editar"
```

---

## Task 4: Limpeza de órfãos ao editar

**Files:**
- Modify: `app/eventos/[id]/editar/actions.ts`
- Create: `lib/marcacoes.ts` (parte 1: `sessaoIdsValidos` + `limparOrfaos`)

**Interfaces:**
- Consumes: `Sessao` de `@/types`; client server de `@/lib/supabase`.
- Produces:
  - `idsDeSessoes(sessoes: Sessao[]): string[]` (puro)
  - `limparOrfaos(supabase, eventoId, sessoes): Promise<void>` — apaga linhas de `inscricoes_sessoes` cujo `sessao_id` não está mais nas sessões.

- [ ] **Step 1: Teste do helper puro**

Adicionar a `lib/sessoes.test.ts`:

```ts
import { idsDeSessoes } from './marcacoes'

describe('idsDeSessoes', () => {
  it('extrai os ids', () => {
    expect(idsDeSessoes([s({ id: 'a' }), s({ id: 'b' })])).toEqual(['a', 'b'])
    expect(idsDeSessoes([])).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar — falha**

Run: `npm run test` — Expected: FAIL (`./marcacoes` não existe).

- [ ] **Step 3: Implementar lib/marcacoes.ts (parte 1)**

Create `lib/marcacoes.ts`:

```ts
import type { Sessao } from '@/types'
import type { createAdminSupabase } from '@/lib/supabase'

type Admin = ReturnType<typeof createAdminSupabase>

/** Ids das sessões existentes. Puro. */
export function idsDeSessoes(sessoes: Sessao[]): string[] {
  return sessoes.map((s) => s.id)
}

/** Apaga marcações cujo sessao_id não existe mais no cronograma do evento. */
export async function limparOrfaos(
  admin: Admin,
  eventoId: string,
  sessoes: Sessao[]
): Promise<void> {
  const validos = idsDeSessoes(sessoes)
  if (validos.length === 0) {
    await admin.from('inscricoes_sessoes').delete().eq('evento_id', eventoId)
    return
  }
  const lista = validos.map((id) => `"${id}"`).join(',')
  await admin
    .from('inscricoes_sessoes')
    .delete()
    .eq('evento_id', eventoId)
    .not('sessao_id', 'in', `(${lista})`)
}
```

- [ ] **Step 4: Rodar — passa**

Run: `npm run test` — Expected: PASS.

- [ ] **Step 5: Chamar no editar**

Modify `app/eventos/[id]/editar/actions.ts`. Ler o arquivo primeiro. Após o `update` bem-sucedido do evento (e antes do redirect/return de sucesso), usar o admin client para limpar órfãos com base no `payload.sessoes`:

```ts
import { createAdminSupabase } from '@/lib/supabase'
import { limparOrfaos } from '@/lib/marcacoes'
```

E após o update ter sucesso:

```ts
  await limparOrfaos(createAdminSupabase(), id, payload.sessoes)
```

(Se `actions.ts` não tiver acesso a `id`/`payload` nesse ponto, ajustar para usar as variáveis existentes — o `id` é o primeiro parâmetro de `atualizarEvento(id, formData)` e `payload` vem de `montarPayloadUpdate`.)

- [ ] **Step 6: Testes + build**

Run: `npm run test` — Expected: PASS.
Run: `npm run build` — Expected: passa.

- [ ] **Step 7: Commit**

```bash
git add lib/marcacoes.ts lib/sessoes.test.ts app/eventos/[id]/editar/actions.ts
git commit -m "feat: limpa marcacoes orfas ao editar cronograma"
```

---

## Task 5: Cronograma read-only na página pública

**Files:**
- Create: `components/Cronograma.tsx`
- Modify: `app/e/[slug]/page.tsx`
- Extend: `lib/marcacoes.ts` (parte 2: `contarPorSessao`)

**Interfaces:**
- Consumes: `agruparPorDia`, `rotuloTipo` de `@/lib/sessoes`; `Sessao` de `@/types`.
- Produces:
  - `contarPorSessao(admin, eventoId): Promise<Record<string, number>>` — mapa sessao_id → nº de marcações.
  - Componente `Cronograma({ sessoes, contagens }: { sessoes: Sessao[]; contagens?: Record<string, number> })`.

- [ ] **Step 1: contarPorSessao em lib/marcacoes.ts**

Adicionar a `lib/marcacoes.ts`:

```ts
/** Conta marcações por sessao_id no evento. */
export async function contarPorSessao(
  admin: Admin,
  eventoId: string
): Promise<Record<string, number>> {
  const { data } = await admin
    .from('inscricoes_sessoes')
    .select('sessao_id')
    .eq('evento_id', eventoId)
  const mapa: Record<string, number> = {}
  for (const row of data ?? []) {
    const id = (row as { sessao_id: string }).sessao_id
    mapa[id] = (mapa[id] ?? 0) + 1
  }
  return mapa
}
```

- [ ] **Step 2: Componente Cronograma**

Create `components/Cronograma.tsx`:

```tsx
import { Sessao } from '@/types'
import { agruparPorDia, rotuloTipo } from '@/lib/sessoes'

function formatarDia(iso: string): string {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
}

// Exibição read-only do cronograma, agrupada por dia. Server component.
export function Cronograma({
  sessoes,
  contagens,
}: {
  sessoes: Sessao[]
  contagens?: Record<string, number>
}) {
  if (!sessoes || sessoes.length === 0) return null
  const grupos = agruparPorDia(sessoes)

  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl font-semibold mb-4">Programação</h2>
      <div className="grid gap-6">
        {grupos.map((g) => (
          <div key={g.dia}>
            <h3 className="font-display text-lg font-semibold capitalize text-primary">
              {formatarDia(g.dia)}
            </h3>
            <div className="grid gap-2.5 mt-3">
              {g.itens.map((s) => {
                const usadas = contagens?.[s.id] ?? 0
                const lotada = s.vagas_max != null && usadas >= s.vagas_max
                return (
                  <div key={s.id} className="card p-4 flex gap-4 items-start">
                    <div className="text-sm font-semibold text-secondary whitespace-nowrap">
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

- [ ] **Step 3: Usar na página pública**

Modify `app/e/[slug]/page.tsx`. Import:

```tsx
import { Cronograma } from '@/components/Cronograma'
import { createAdminSupabase } from '@/lib/supabase'
import { contarPorSessao } from '@/lib/marcacoes'
```

Após obter `ev` (o evento), buscar contagens (só se houver sessões com vaga) e renderizar o `Cronograma` dentro do `<article>`/container principal, após o bloco de descrição:

```tsx
```
(No corpo da página, após a `</article>` do card de detalhes e antes do parágrafo "Você receberá um ingresso…", inserir:)

```tsx
        <Cronograma sessoes={ev.sessoes} contagens={await contarPorSessao(createAdminSupabase(), ev.id)} />
```

- [ ] **Step 4: Build**

Run: `npm run build` — Expected: passa.

- [ ] **Step 5: Smoke** (usuário)

Criar evento com sessões; abrir `/e/{slug}` — programação agrupada por dia, badges de tipo, vagas.

- [ ] **Step 6: Commit**

```bash
git add components/Cronograma.tsx app/e/[slug]/page.tsx lib/marcacoes.ts
git commit -m "feat: exibe cronograma na pagina publica (read-only)"
```

---

## Task 6: Marcar interesse na inscrição

**Files:**
- Modify: `app/e/[slug]/inscricao/page.tsx`
- Modify: `app/e/[slug]/inscricao/InscricaoForm.tsx`
- Modify: `app/e/[slug]/inscricao/actions.ts`
- Extend: `lib/marcacoes.ts` (parte 3: `gravarMarcacoes`)

**Interfaces:**
- Consumes: `agruparPorDia`, `rotuloTipo`; `contarPorSessao`; `Sessao`.
- Produces:
  - `gravarMarcacoes(admin, eventoId, inscricaoId, sessaoIds, sessoes): Promise<string[]>` — insere marcações válidas respeitando vaga; retorna os títulos das sessões rejeitadas por lotação.

- [ ] **Step 1: gravarMarcacoes em lib/marcacoes.ts**

Adicionar a `lib/marcacoes.ts` (import `Sessao` já presente):

```ts
/**
 * Insere marcações para uma inscrição, respeitando vaga por sessão.
 * Retorna os títulos das sessões rejeitadas por lotação (para avisar o participante).
 */
export async function gravarMarcacoes(
  admin: Admin,
  eventoId: string,
  inscricaoId: string,
  sessaoIds: string[],
  sessoes: Sessao[]
): Promise<string[]> {
  if (sessaoIds.length === 0) return []
  const contagens = await contarPorSessao(admin, eventoId)
  const porId = new Map(sessoes.map((s) => [s.id, s]))
  const rejeitadas: string[] = []
  const inserir: { inscricao_id: string; evento_id: string; sessao_id: string }[] = []

  for (const id of sessaoIds) {
    const sessao = porId.get(id)
    if (!sessao) continue // id inexistente, ignora
    if (sessao.vagas_max != null && (contagens[id] ?? 0) >= sessao.vagas_max) {
      rejeitadas.push(sessao.titulo)
      continue
    }
    inserir.push({ inscricao_id: inscricaoId, evento_id: eventoId, sessao_id: id })
  }

  if (inserir.length > 0) {
    await admin.from('inscricoes_sessoes').insert(inserir)
  }
  return rejeitadas
}
```

- [ ] **Step 2: Passar sessões ao form**

Modify `app/e/[slug]/inscricao/page.tsx`. Ler primeiro. Passar `sessoes` e `contagens` ao `InscricaoForm` (buscar contagens via `contarPorSessao(createAdminSupabase(), evento.id)`). Adicionar props:

```tsx
<InscricaoForm slug={slug} camposExtras={evento.campos_extras} sessoes={evento.sessoes} contagens={contagens} />
```

- [ ] **Step 3: Checkboxes no InscricaoForm**

Modify `app/e/[slug]/inscricao/InscricaoForm.tsx`.

Props e imports:

```tsx
import { Sessao } from '@/types'
import { agruparPorDia, rotuloTipo } from '@/lib/sessoes'

interface Props {
  slug: string
  camposExtras: CampoExtra[]
  sessoes: Sessao[]
  contagens: Record<string, number>
}
```

Assinatura: `export function InscricaoForm({ slug, camposExtras, sessoes, contagens }: Props) {`

Estado das marcações:

```tsx
  const [marcadas, setMarcadas] = useState<string[]>([])
```

Em `enviar`, antes de chamar `inscrever`:

```tsx
    formData.set('sessoes_marcadas', JSON.stringify(marcadas))
```

Antes do `<Button type="submit">`, inserir o bloco de sessões (só se houver):

```tsx
      {sessoes.length > 0 && (
        <div className="grid gap-2.5">
          <span className="text-[13px] font-semibold">Quero participar de:</span>
          {agruparPorDia(sessoes).map((g) => (
            <div key={g.dia} className="grid gap-1.5">
              {g.itens.map((s) => {
                const lotada = s.vagas_max != null && (contagens[s.id] ?? 0) >= s.vagas_max
                const on = marcadas.includes(s.id)
                return (
                  <label
                    key={s.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-md border ${
                      lotada ? 'border-line opacity-50' : on ? 'border-primary bg-status-inscrito-bg' : 'border-line'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      disabled={lotada}
                      checked={on}
                      onChange={(e) =>
                        setMarcadas((m) => (e.target.checked ? [...m, s.id] : m.filter((x) => x !== s.id)))
                      }
                    />
                    <span className="text-sm">
                      <span className="font-semibold">{s.titulo}</span>
                      <span className="text-muted"> · {rotuloTipo(s)} · {s.hora_inicio}</span>
                      {lotada && <span className="text-error"> · esgotado</span>}
                    </span>
                  </label>
                )
              })}
            </div>
          ))}
        </div>
      )}
```

- [ ] **Step 4: Gravar na action de inscrição**

Modify `app/e/[slug]/inscricao/actions.ts`.

Import:

```ts
import { gravarMarcacoes } from '@/lib/marcacoes'
import { parseSessoes } from '@/lib/sessoes'
```

Trocar o `insert` da inscrição para capturar o id:

```ts
  const { data: inscricaoRow, error } = await supabase
    .from('inscricoes')
    .insert({
      evento_id: evento.id,
      nome,
      email,
      dados_extras: dadosExtras,
      status: 'inscrito',
      token,
    })
    .select('id')
    .single()

  if (error || !inscricaoRow) {
    return { ok: false, erro: 'Não foi possível concluir sua inscrição. Tente novamente.' }
  }
```

Após o insert (antes do envio de e-mail), gravar marcações:

```ts
  const idsMarcados = parseSessoes(String(formData.get('sessoes_marcadas') ?? '[]')) as unknown as string[]
  // sessoes_marcadas é um array de ids (strings). parseSessoes só garante array; validamos aqui.
  const marcados = Array.isArray(idsMarcados) ? idsMarcados.map(String) : []
  const rejeitadas = await gravarMarcacoes(supabase, evento.id, inscricaoRow.id, marcados, evento.sessoes)
```

E retornar aviso se houver rejeitadas (mantendo `ok: true` — a inscrição vale):

```ts
  if (rejeitadas.length > 0) {
    return { ok: true, aviso: `Estas sessões já estavam lotadas: ${rejeitadas.join(', ')}.` }
  }
```

Adicionar `aviso?: string` ao `InscreverResult`. E o `InscricaoForm` exibe `res.aviso` no estado de sucesso quando presente.

NOTA sobre `parseSessoes`: ele foi feito para `Sessao[]`. Para ids (strings) use um parse local simples em vez de forçar tipo. Substituir por:

```ts
function parseIds(json: string): string[] {
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}
```

e usar `const marcados = parseIds(String(formData.get('sessoes_marcadas') ?? '[]'))`. (Não usar `parseSessoes` para ids.)

- [ ] **Step 5: Exibir aviso no form**

Modify `InscricaoForm.tsx`: guardar `aviso` em estado e mostrá-lo no bloco de sucesso:

```tsx
  const [aviso, setAviso] = useState<string | null>(null)
```
Em `enviar`, no ramo `res.ok`: `setAviso(res.aviso ?? null); setSucesso(true)`. No bloco de sucesso, se `aviso`, mostrar `<p className="text-warning text-sm mt-2">{aviso}</p>`.

- [ ] **Step 6: Testes + build**

Run: `npm run test` — Expected: PASS.
Run: `npm run build` — Expected: passa.

- [ ] **Step 7: Smoke** (usuário)

Inscrever marcando sessões; conferir gravação e aviso quando lotada.

- [ ] **Step 8: Commit**

```bash
git add lib/marcacoes.ts app/e/[slug]/inscricao/
git commit -m "feat: participante marca interesse em sessoes na inscricao (com vaga)"
```

---

## Task 7: Editar marcações pelo ingresso

**Files:**
- Modify: `app/i/[token]/page.tsx`
- Create: `app/i/[token]/SessoesEditor.tsx`
- Modify: `app/i/[token]/actions.ts`
- Extend: `lib/marcacoes.ts` (parte 4: `reconciliarMarcacoes`, `marcacoesDaInscricao`)

**Interfaces:**
- Consumes: `Sessao`; `contarPorSessao`, `gravarMarcacoes`; admin client.
- Produces:
  - `marcacoesDaInscricao(admin, inscricaoId): Promise<string[]>` — ids marcados.
  - `reconciliarMarcacoes(admin, eventoId, inscricaoId, sessaoIds, sessoes): Promise<string[]>` — remove desmarcadas, insere novas (respeitando vaga); retorna títulos rejeitados.

- [ ] **Step 1: Helpers de reconciliação**

Adicionar a `lib/marcacoes.ts`:

```ts
/** Ids de sessões já marcados por uma inscrição. */
export async function marcacoesDaInscricao(admin: Admin, inscricaoId: string): Promise<string[]> {
  const { data } = await admin
    .from('inscricoes_sessoes')
    .select('sessao_id')
    .eq('inscricao_id', inscricaoId)
  return (data ?? []).map((r) => (r as { sessao_id: string }).sessao_id)
}

/**
 * Reconcilia as marcações de uma inscrição para o conjunto desejado:
 * remove as que saíram, insere as novas respeitando vaga.
 * Retorna títulos rejeitados por lotação.
 */
export async function reconciliarMarcacoes(
  admin: Admin,
  eventoId: string,
  inscricaoId: string,
  desejadas: string[],
  sessoes: Sessao[]
): Promise<string[]> {
  const atuais = await marcacoesDaInscricao(admin, inscricaoId)
  const remover = atuais.filter((id) => !desejadas.includes(id))
  const adicionar = desejadas.filter((id) => !atuais.includes(id))

  if (remover.length > 0) {
    await admin
      .from('inscricoes_sessoes')
      .delete()
      .eq('inscricao_id', inscricaoId)
      .in('sessao_id', remover)
  }
  // adicionar respeitando vaga (reusa gravarMarcacoes)
  return gravarMarcacoes(admin, eventoId, inscricaoId, adicionar, sessoes)
}
```

- [ ] **Step 2: Action atualizarSessoes**

Modify `app/i/[token]/actions.ts`. Ler primeiro. Adicionar:

```ts
import { createAdminSupabase } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { reconciliarMarcacoes } from '@/lib/marcacoes'
import { Evento, Inscricao } from '@/types'

export interface AtualizarSessoesResult {
  ok: boolean
  erro?: string
  aviso?: string
}

export async function atualizarSessoes(
  token: string,
  sessaoIds: string[]
): Promise<AtualizarSessoesResult> {
  const admin = createAdminSupabase()
  const { data: insc } = await admin
    .from('inscricoes')
    .select('id, evento_id, eventos(*)')
    .eq('token', token)
    .single()
  if (!insc) return { ok: false, erro: 'Ingresso não encontrado.' }

  const row = insc as unknown as { id: string; evento_id: string; eventos: Evento }
  const rejeitadas = await reconciliarMarcacoes(
    admin,
    row.evento_id,
    row.id,
    sessaoIds.map(String),
    row.eventos.sessoes
  )
  revalidatePath(`/i/${token}`)
  if (rejeitadas.length > 0) {
    return { ok: true, aviso: `Não foi possível entrar em: ${rejeitadas.join(', ')} (lotadas).` }
  }
  return { ok: true }
}
```

- [ ] **Step 3: SessoesEditor (client)**

Create `app/i/[token]/SessoesEditor.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Sessao } from '@/types'
import { agruparPorDia, rotuloTipo } from '@/lib/sessoes'
import { atualizarSessoes } from './actions'

interface Props {
  token: string
  sessoes: Sessao[]
  marcadasIniciais: string[]
  contagens: Record<string, number>
}

// Editor de marcações de sessão no ingresso. Salva via server action.
export function SessoesEditor({ token, sessoes, marcadasIniciais, contagens }: Props) {
  const [marcadas, setMarcadas] = useState<string[]>(marcadasIniciais)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  if (sessoes.length === 0) return null

  async function salvar() {
    setSalvando(true)
    setMsg(null)
    const res = await atualizarSessoes(token, marcadas)
    setSalvando(false)
    setMsg(res.aviso ?? (res.ok ? 'Sessões atualizadas.' : res.erro ?? 'Erro ao salvar.'))
  }

  return (
    <div className="px-6 py-4 border-t border-line">
      <div className="text-sm font-semibold mb-2">Minhas sessões</div>
      <div className="grid gap-1.5">
        {agruparPorDia(sessoes).map((g) =>
          g.itens.map((s) => {
            const on = marcadas.includes(s.id)
            const lotada = s.vagas_max != null && !on && (contagens[s.id] ?? 0) >= s.vagas_max
            return (
              <label key={s.id} className={`flex items-center gap-2 text-sm ${lotada ? 'opacity-50' : ''}`}>
                <input
                  type="checkbox"
                  disabled={lotada}
                  checked={on}
                  onChange={(e) =>
                    setMarcadas((m) => (e.target.checked ? [...m, s.id] : m.filter((x) => x !== s.id)))
                  }
                />
                <span>
                  {s.titulo} <span className="text-muted">· {rotuloTipo(s)} · {s.hora_inicio}</span>
                </span>
              </label>
            )
          })
        )}
      </div>
      <button
        type="button"
        onClick={salvar}
        disabled={salvando}
        className="btn btn-secondary mt-3 text-sm"
      >
        {salvando ? 'Salvando…' : 'Salvar sessões'}
      </button>
      {msg && <p className="text-xs text-muted mt-2">{msg}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Renderizar no ingresso**

Modify `app/i/[token]/page.tsx`. Import:

```tsx
import { SessoesEditor } from './SessoesEditor'
import { marcacoesDaInscricao, contarPorSessao } from '@/lib/marcacoes'
```

Após obter `insc`/`ev` (o ingresso já usa `createAdminSupabase`), buscar as marcações atuais e contagens, e renderizar o editor dentro do card do ingresso (após o bloco de dados, antes do rodapé "Apresente esta tela"):

```tsx
          {ev.sessoes.length > 0 && (
            <SessoesEditor
              token={insc.token}
              sessoes={ev.sessoes}
              marcadasIniciais={await marcacoesDaInscricao(supabase, insc.id)}
              contagens={await contarPorSessao(supabase, ev.id)}
            />
          )}
```

(`supabase` aqui é o admin client já criado na página; `insc.id` é o id da inscrição — confirmar que a query do ingresso seleciona `id`; se não, ajustar o select para incluir `id`.)

- [ ] **Step 5: Build**

Run: `npm run build` — Expected: passa.

- [ ] **Step 6: Smoke** (usuário)

Abrir ingresso; marcar/desmarcar sessões; salvar; recarregar confirma persistência.

- [ ] **Step 7: Commit**

```bash
git add app/i/[token]/ lib/marcacoes.ts
git commit -m "feat: editar marcacoes de sessao pelo ingresso"
```

---

## Task 8: Relatório por sessão + link + skill

**Files:**
- Create: `app/eventos/[id]/sessoes/page.tsx`
- Modify: `components/EventCard.tsx`
- Modify: `.claude/skills/creden-supabase/SKILL.md`

**Interfaces:**
- Consumes: `agruparPorDia`, `rotuloTipo`; `createServerSupabase` (guarda de dono via RLS).

- [ ] **Step 1: Página de relatório**

Create `app/eventos/[id]/sessoes/page.tsx`:

```tsx
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase'
import { Evento } from '@/types'
import { agruparPorDia, rotuloTipo } from '@/lib/sessoes'

// Relatório por sessão (organizador). RLS garante que só o dono lê inscricoes_sessoes.
export default async function SessoesRelatorioPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabase()

  const { data: eventoRow } = await supabase.from('eventos').select('*').eq('id', params.id).single()
  if (!eventoRow) {
    return <div className="p-8">Evento não encontrado.</div>
  }
  const ev = eventoRow as Evento

  // Marcações + inscrito (join). RLS restringe ao dono.
  const { data: marc } = await supabase
    .from('inscricoes_sessoes')
    .select('sessao_id, inscricoes(nome, email)')
    .eq('evento_id', ev.id)

  const porSessao = new Map<string, { nome: string; email: string }[]>()
  for (const row of (marc ?? []) as unknown as {
    sessao_id: string
    inscricoes: { nome: string; email: string } | null
  }[]) {
    if (!row.inscricoes) continue
    const arr = porSessao.get(row.sessao_id) ?? []
    arr.push(row.inscricoes)
    porSessao.set(row.sessao_id, arr)
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <Link href="/dashboard" className="text-sm text-primary hover:underline">← Voltar</Link>
      <h1 className="font-display text-3xl font-semibold mt-2">Sessões — {ev.nome}</h1>
      {ev.sessoes.length === 0 ? (
        <p className="text-muted mt-4">Este evento não tem programação.</p>
      ) : (
        <div className="grid gap-6 mt-6">
          {agruparPorDia(ev.sessoes).map((g) => (
            <div key={g.dia}>
              <h2 className="font-display text-lg font-semibold text-primary">{g.dia}</h2>
              <div className="grid gap-3 mt-2">
                {g.itens.map((s) => {
                  const pessoas = porSessao.get(s.id) ?? []
                  return (
                    <div key={s.id} className="card p-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="badge badge-inscrito">{rotuloTipo(s)}</span>
                        <span className="font-semibold">{s.titulo}</span>
                        <span className="text-sm text-muted">
                          {s.hora_inicio} ·{' '}
                          {s.vagas_max != null
                            ? `${pessoas.length} de ${s.vagas_max}`
                            : `${pessoas.length} marcações`}
                        </span>
                      </div>
                      {pessoas.length > 0 && (
                        <ul className="text-sm text-muted mt-2 grid gap-0.5">
                          {pessoas.map((p, i) => (
                            <li key={i}>{p.nome} — {p.email}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 2: Link no EventCard**

Modify `components/EventCard.tsx`. Junto ao botão "Gerenciar"/"Editar", adicionar um link para `/eventos/${evento.id}/sessoes` rotulado "Programação" (usar `ButtonLink variant="ghost"` seguindo o padrão existente). Só faz sentido mostrar se `evento.sessoes?.length` — mas mostrar sempre é aceitável (a página lida com vazio).

```tsx
          <ButtonLink variant="ghost" href={`/eventos/${evento.id}/sessoes`}>
            Programação
          </ButtonLink>
```

- [ ] **Step 3: Documentar na skill**

Modify `.claude/skills/creden-supabase/SKILL.md`: adicionar `sessoes jsonb` ao modelo de `eventos`; documentar a tabela `inscricoes_sessoes` (marcações de interesse, unique inscricao+sessao, RLS: insert anônimo, select/delete só dono, participante via service_role por token).

- [ ] **Step 4: Testes + build**

Run: `npm run test` — Expected: PASS.
Run: `npm run build` — Expected: passa.

- [ ] **Step 5: Smoke** (usuário)

Dashboard → "Programação" → relatório mostra contagem e nomes por sessão.

- [ ] **Step 6: Commit**

```bash
git add app/eventos/[id]/sessoes/page.tsx components/EventCard.tsx .claude/skills/creden-supabase/SKILL.md
git commit -m "feat: relatorio por sessao + link no dashboard; skill atualizada"
```

---

## Self-Review

- **Cobertura do spec:** schema+tipos (T1) ✓; helpers (T2) ✓; form organizador + gravar criar/editar (T3) ✓; órfãos (T4) ✓; cronograma público read-only (T5) ✓; marcar na inscrição com vaga (T6) ✓; editar pelo ingresso (T7) ✓; relatório + link + skill (T8) ✓. `tipo_outro` coberto em T2 (rotuloTipo) e T3 (form). Fora de escopo (CSV, conflito, check-in por sessão, fila) não vira task — correto.
- **Placeholders:** as notas "ler o arquivo primeiro / confirmar que o select inclui id" são instruções reais de integração (o implementer deve casar o texto existente), não placeholders de lógica — cada uma acompanha o código concreto a inserir. Sem TBD/TODO de lógica.
- **Consistência de tipos:** `Sessao`/`TipoSessao` definidos em T1 e usados igual em T2-T8; `contarPorSessao`/`gravarMarcacoes`/`reconciliarMarcacoes`/`marcacoesDaInscricao`/`limparOrfaos`/`idsDeSessoes` todos declarados em `lib/marcacoes.ts` (T4-T7) com assinaturas fixas e consumidos com elas; `parseSessoes` (Sessao[]) separado de `parseIds` (string[]) — evita o erro de usar parseSessoes para ids (chamado explicitamente na T6 Step 4).
- **Padrões do projeto:** service_role no servidor (inscrição/ingresso), RLS para leitura do organizador, jsonb como campos_extras, `crypto.randomUUID()` para ids, vitest para puros. Coerente.
