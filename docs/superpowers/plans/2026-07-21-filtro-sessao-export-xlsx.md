# Filtro por sessão + export XLSX estilizado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Filtrar a lista de inscritos por sessão do cronograma (regra E) e exportar tudo em XLSX estilizado com uma coluna por sessão.

**Architecture:** Um helper puro (`lib/sessoes.ts`) achata as sessões do jsonb `eventos.dias` e é a fonte única de ordem/rótulo, reusado pelo filtro (client) e pelo export (server). O filtro carrega as marcações de `inscricoes_sessoes` e aplica a regra E no cliente. O export troca a montagem manual de CSV por um workbook `exceljs` estilizado enviado como buffer.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Supabase, exceljs, Vitest.

## Global Constraints

- UI e microcopy em **pt-BR**.
- Cor primária da marca: `#0E5C56` (ARGB no exceljs: `FF0E5C56`).
- Não expor `service_role` no browser; queries no server usam o client de sessão (RLS).
- Sessões com `sem_inscricao === true` (intervalos) são ignoradas em filtro e export.
- Regra do filtro de sessão: **E (todas)** — inscrito aparece só se marcou todas as sessões selecionadas.
- Export não aplica o filtro da tela — traz todos os inscritos.
- Commits sem trailer `Co-Authored-By`.

---

### Task 1: Helper `sessoesDoEvento` (puro)

**Files:**
- Create: `lib/sessoes.ts`
- Test: `lib/sessoes.test.ts`

**Interfaces:**
- Consumes: `Dia`, `Sessao`, `Categoria` de `@/types`.
- Produces: `sessoesDoEvento(dias: Dia[]): SessaoAchatada[]` onde
  `SessaoAchatada = { id: string; titulo: string; data: string }`. O `titulo`
  já vem desambiguado (com data entre parênteses) quando o mesmo título aparece
  em mais de um dia. Ordem = ordem do cronograma (sessões soltas do dia primeiro,
  depois as de cada categoria, na ordem dos arrays).

- [ ] **Step 1: Write the failing test**

```ts
// lib/sessoes.test.ts
import { describe, it, expect } from 'vitest'
import { sessoesDoEvento } from './sessoes'
import type { Dia } from '@/types'

function sessao(over: Partial<import('@/types').Sessao> & { id: string; titulo: string }) {
  return {
    hora_inicio: '09:00',
    hora_fim: '10:00',
    tipo: 'palestra',
    tipo_outro: null,
    palestrante: null,
    local: null,
    vagas_max: null,
    sem_inscricao: false,
    ...over,
  } as import('@/types').Sessao
}

describe('sessoesDoEvento', () => {
  it('achata sessões soltas e de categorias na ordem do cronograma', () => {
    const dias: Dia[] = [
      {
        id: 'd1',
        data: '2026-07-21',
        sessoes: [sessao({ id: 's1', titulo: 'Abertura' })],
        categorias: [
          { id: 'c1', titulo: 'Manhã', sessoes: [sessao({ id: 's2', titulo: 'Workshop A' })] },
        ],
      },
    ]
    expect(sessoesDoEvento(dias)).toEqual([
      { id: 's1', titulo: 'Abertura', data: '2026-07-21' },
      { id: 's2', titulo: 'Workshop A', data: '2026-07-21' },
    ])
  })

  it('ignora sessões com sem_inscricao', () => {
    const dias: Dia[] = [
      {
        id: 'd1',
        data: '2026-07-21',
        sessoes: [
          sessao({ id: 's1', titulo: 'Abertura' }),
          sessao({ id: 'pausa', titulo: 'Café', sem_inscricao: true }),
        ],
        categorias: [],
      },
    ]
    expect(sessoesDoEvento(dias).map((s) => s.id)).toEqual(['s1'])
  })

  it('desambigua título repetido entre dias com a data', () => {
    const dias: Dia[] = [
      { id: 'd1', data: '2026-07-21', sessoes: [sessao({ id: 's1', titulo: 'Abertura' })], categorias: [] },
      { id: 'd2', data: '2026-07-22', sessoes: [sessao({ id: 's2', titulo: 'Abertura' })], categorias: [] },
    ]
    expect(sessoesDoEvento(dias).map((s) => s.titulo)).toEqual([
      'Abertura (21/07)',
      'Abertura (22/07)',
    ])
  })

  it('não desambigua quando o título é único', () => {
    const dias: Dia[] = [
      { id: 'd1', data: '2026-07-21', sessoes: [sessao({ id: 's1', titulo: 'Abertura' })], categorias: [] },
    ]
    expect(sessoesDoEvento(dias)[0].titulo).toBe('Abertura')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/sessoes.test.ts`
Expected: FAIL — `sessoesDoEvento is not a function` / módulo não encontrado.

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/sessoes.ts
import type { Dia } from '@/types'

export interface SessaoAchatada {
  id: string
  titulo: string
  data: string // 'YYYY-MM-DD'
}

/** dd/MM a partir de 'YYYY-MM-DD' (sem timezone — string pura). */
function diaMes(data: string): string {
  const [, mes, dia] = data.split('-')
  return `${dia}/${mes}`
}

/**
 * Achata todas as sessões selecionáveis do cronograma (soltas + de categorias),
 * na ordem em que aparecem. Ignora intervalos (`sem_inscricao`). Quando o mesmo
 * título aparece em mais de um dia, desambigua com a data (ex.: "Abertura (21/07)").
 * Fonte única de ordem e rótulo das sessões — usada pelo filtro e pelo export.
 */
export function sessoesDoEvento(dias: Dia[]): SessaoAchatada[] {
  const bruto: { id: string; titulo: string; data: string }[] = []
  for (const dia of dias) {
    const todas = [...dia.sessoes, ...dia.categorias.flatMap((c) => c.sessoes)]
    for (const s of todas) {
      if (s.sem_inscricao) continue
      bruto.push({ id: s.id, titulo: s.titulo, data: dia.data })
    }
  }

  // Títulos que aparecem em mais de um dia precisam de desambiguação.
  const diasPorTitulo = new Map<string, Set<string>>()
  for (const s of bruto) {
    const set = diasPorTitulo.get(s.titulo) ?? new Set<string>()
    set.add(s.data)
    diasPorTitulo.set(s.titulo, set)
  }

  return bruto.map((s) => ({
    id: s.id,
    data: s.data,
    titulo: (diasPorTitulo.get(s.titulo)?.size ?? 0) > 1 ? `${s.titulo} (${diaMes(s.data)})` : s.titulo,
  }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/sessoes.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/sessoes.ts lib/sessoes.test.ts
git commit -m "feat: helper sessoesDoEvento achata sessoes do cronograma"
```

---

### Task 2: Filtro por sessão na tela

**Files:**
- Modify: `app/eventos/[id]/(gerir)/inscritos/page.tsx`
- Modify: `app/eventos/[id]/(gerir)/inscritos/InscritosClient.tsx`

**Interfaces:**
- Consumes: `sessoesDoEvento` (Task 1); tabela `inscricoes_sessoes` (`inscricao_id`, `sessao_id`).
- Produces: `InscritosClient` passa a aceitar props novas
  `sessoes: SessaoAchatada[]` e `marcacoesPorInscrito: Record<string, string[]>`.

- [ ] **Step 1: `page.tsx` — carregar marcações e sessões, passar como props**

Em `app/eventos/[id]/(gerir)/inscritos/page.tsx`:

Adiciona o import no topo (junto aos outros):

```ts
import { sessoesDoEvento } from '@/lib/sessoes'
```

Troca o bloco do `Promise.all` (linhas 17-24) para incluir as marcações:

```ts
  const [{ data: evento }, { data: inscricoes }, { data: marcacoes }] = await Promise.all([
    supabase.from('eventos').select('*').eq('id', params.id).single(),
    supabase
      .from('inscricoes')
      .select('*')
      .eq('evento_id', params.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('inscricoes_sessoes')
      .select('inscricao_id, sessao_id')
      .eq('evento_id', params.id),
  ])
```

Depois de `const ev = evento as Evento` (linha 30), monta as sessões e o mapa:

```ts
  const sessoes = sessoesDoEvento(ev.dias ?? [])
  const marcacoesPorInscrito: Record<string, string[]> = {}
  for (const m of (marcacoes ?? []) as { inscricao_id: string; sessao_id: string }[]) {
    ;(marcacoesPorInscrito[m.inscricao_id] ??= []).push(m.sessao_id)
  }
```

Passa as props novas ao `InscritosClient` (dentro do JSX já existente):

```tsx
      <InscritosClient
        eventoId={ev.id}
        inscricoes={lista}
        podeEditar={acesso.podeEditar}
        podeCheckin={podeCheckin}
        camposExtras={ev.campos_extras ?? []}
        dias={ev.dias ?? []}
        sessoes={sessoes}
        marcacoesPorInscrito={marcacoesPorInscrito}
      />
```

- [ ] **Step 2: `InscritosClient.tsx` — props, estado e import**

No topo, adiciona o import do tipo:

```ts
import { SessaoAchatada } from '@/lib/sessoes'
```

Na interface `Props` (após `dias: Dia[]`), adiciona:

```ts
  sessoes: SessaoAchatada[]
  marcacoesPorInscrito: Record<string, string[]>
```

Na desestruturação da função `InscritosClient({ ... })`, adiciona `sessoes` e `marcacoesPorInscrito`.

Junto aos outros `useState` (perto de `const [sel, setSel] = ...`), adiciona:

```ts
  // Sessões selecionadas no filtro. Vazio = não filtra por sessão.
  const [selSessoes, setSelSessoes] = useState<Set<string>>(new Set())
```

Adiciona a função de alternar sessão (perto de `function alternar`):

```ts
  function alternarSessao(id: string) {
    setSelSessoes((prev) => {
      const proximo = new Set(prev)
      if (proximo.has(id)) proximo.delete(id)
      else proximo.add(id)
      return proximo
    })
  }
```

- [ ] **Step 3: `InscritosClient.tsx` — aplicar regra E no `lista` e resetar página**

Troca o corpo do `useMemo` de `lista` para incluir a condição de sessão (regra E):

```ts
  const lista = useMemo(() => {
    const q = termo.trim().toLowerCase()
    return inscricoes.filter((i) => {
      if (sel.size > 0 && !sel.has(i.status)) return false
      if (q && !i.nome.toLowerCase().includes(q) && !i.email.toLowerCase().includes(q)) return false
      if (selSessoes.size > 0) {
        const marcadas = new Set(marcacoesPorInscrito[i.id] ?? [])
        if (![...selSessoes].every((sid) => marcadas.has(sid))) return false
      }
      return true
    })
  }, [inscricoes, termo, sel, selSessoes, marcacoesPorInscrito])
```

No `useEffect` que reseta a página, adiciona `selSessoes` às dependências:

```ts
  useEffect(() => {
    setPagina(1)
  }, [termo, sel, selSessoes])
```

- [ ] **Step 4: `InscritosClient.tsx` — contador do botão e "Limpar filtros"**

O contador do botão de filtro (`{sel.size > 0 && (...)}`) passa a somar sessões.
Troca a condição e o número exibido:

- A classe condicional do botão (`sel.size > 0 ? ...`) vira `sel.size + selSessoes.size > 0 ? ...`.
- O badge do contador: condição `sel.size + selSessoes.size > 0` e valor `{sel.size + selSessoes.size}`.

O "Limpar filtros": a condição de exibição vira `sel.size + selSessoes.size > 0` e o
`onClick` zera os dois:

```tsx
                  <button
                    onClick={() => {
                      setSel(new Set())
                      setSelSessoes(new Set())
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-muted hover:bg-sand hover:text-ink"
                  >
                    Limpar filtros
                  </button>
```

- [ ] **Step 5: `InscritosClient.tsx` — bloco "Sessões" no dropdown**

Dentro do `<div role="menu" ...>`, logo após o `.map(STATUS_OPCOES...)` e antes do
bloco "Limpar filtros", adiciona o grupo de sessões (só quando há sessões):

```tsx
              {sessoes.length > 0 && (
                <>
                  <div className="h-px bg-line my-1" />
                  <div className="px-3 pt-1 pb-1.5 text-[11px] uppercase tracking-wide text-muted font-semibold">
                    Sessões
                  </div>
                  {sessoes.map((s) => {
                    const marcado = selSessoes.has(s.id)
                    return (
                      <button
                        key={s.id}
                        role="menuitemcheckbox"
                        aria-checked={marcado}
                        onClick={() => alternarSessao(s.id)}
                        className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-3 hover:bg-sand"
                      >
                        <span
                          className={`w-[18px] h-[18px] shrink-0 rounded-[5px] border grid place-items-center transition-colors ${
                            marcado ? 'bg-primary border-primary text-white' : 'border-line bg-surface'
                          }`}
                        >
                          {marcado && (
                            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" aria-hidden>
                              <path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span className="flex-1 text-ink">{s.titulo}</span>
                      </button>
                    )
                  })}
                </>
              )}
```

- [ ] **Step 6: Typecheck e verificação manual da regra E**

Run: `npm run typecheck`
Expected: sem erros.

Verificação manual (descreve o esperado; roda `npm run dev` se quiser conferir):
marcar 2 sessões no filtro deve mostrar só inscritos que marcaram **as duas**.

- [ ] **Step 7: Commit**

```bash
git add "app/eventos/[id]/(gerir)/inscritos/page.tsx" "app/eventos/[id]/(gerir)/inscritos/InscritosClient.tsx"
git commit -m "feat: filtro por sessao na lista de inscritos (regra E)"
```

---

### Task 3: Instalar exceljs

**Files:**
- Modify: `package.json` (via npm)

**Interfaces:**
- Produces: dependência `exceljs` disponível para import no route handler.

- [ ] **Step 1: Instalar**

Run: `npm install exceljs`
Expected: adiciona `exceljs` em `dependencies`, sem erro de peer.

- [ ] **Step 2: Confirmar import resolve**

Run: `node -e "require('exceljs'); console.log('ok')"`
Expected: imprime `ok`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: adiciona exceljs para export XLSX"
```

---

### Task 4: Export XLSX estilizado (substitui CSV)

**Files:**
- Modify: `app/eventos/[id]/(gerir)/inscritos/export/route.ts` (reescrita do handler)

**Interfaces:**
- Consumes: `sessoesDoEvento` (Task 1); `exceljs` (Task 3); tabela `inscricoes_sessoes`.
- Produces: `GET` retorna um `.xlsx` (buffer) com uma aba "Inscritos".

- [ ] **Step 1: Reescrever o route handler**

Substitui todo o conteúdo de `app/eventos/[id]/(gerir)/inscritos/export/route.ts`:

```ts
import ExcelJS from 'exceljs'
import { createServerSupabase } from '@/lib/supabase'
import { formatarDataHoraCurta } from '@/lib/datas'
import { sessoesDoEvento } from '@/lib/sessoes'
import { Evento, Inscricao } from '@/types'

// Export XLSX dos inscritos de um evento (/eventos/[id]/inscritos/export).
// Server-side; RLS garante que só quem tem acesso ao evento recebe os dados.
// Uma aba "Inscritos": dados do inscrito + 1 coluna por sessão (Sim/vazio).

const STATUS_LABEL: Record<Inscricao['status'], string> = {
  inscrito: 'Inscrito',
  presente: 'Presente',
  cancelado: 'Cancelado',
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabase()

  const [{ data: eventoRow }, { data: inscricoesRows }, { data: marcacoesRows }] = await Promise.all([
    supabase.from('eventos').select('*').eq('id', params.id).single(),
    supabase
      .from('inscricoes')
      .select('*')
      .eq('evento_id', params.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('inscricoes_sessoes')
      .select('inscricao_id, sessao_id')
      .eq('evento_id', params.id),
  ])

  if (!eventoRow) {
    return new Response('Evento não encontrado.', { status: 404 })
  }

  const evento = eventoRow as Evento
  const inscricoes = (inscricoesRows ?? []) as Inscricao[]
  const marcacoes = (marcacoesRows ?? []) as { inscricao_id: string; sessao_id: string }[]

  // sessao_id marcados por inscrito, para lookup O(1).
  const marcadasPorInscrito = new Map<string, Set<string>>()
  for (const m of marcacoes) {
    const set = marcadasPorInscrito.get(m.inscricao_id) ?? new Set<string>()
    set.add(m.sessao_id)
    marcadasPorInscrito.set(m.inscricao_id, set)
  }

  const colunasExtras = (evento.campos_extras ?? []).filter((c) => !c.fixo).map((c) => c.label)
  const sessoes = sessoesDoEvento(evento.dias ?? [])

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Creden'
  const ws = workbook.addWorksheet('Inscritos', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  // Chaves de coluna: fixas + extras (prefixo p/ não colidir) + sessões (id).
  ws.columns = [
    { header: 'Nome', key: 'nome', width: 28 },
    { header: 'E-mail', key: 'email', width: 30 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Inscrição', key: 'inscricao', width: 18 },
    { header: 'Check-in', key: 'checkin', width: 18 },
    ...colunasExtras.map((label, idx) => ({ header: label, key: `extra_${idx}`, width: 22 })),
    ...sessoes.map((s) => ({ header: s.titulo, key: `sessao_${s.id}`, width: 20 })),
  ]

  for (const i of inscricoes) {
    const marcadas = marcadasPorInscrito.get(i.id) ?? new Set<string>()
    const linha: Record<string, string> = {
      nome: i.nome,
      email: i.email,
      status: STATUS_LABEL[i.status],
      inscricao: formatarDataHoraCurta(i.created_at),
      checkin: i.checkin_at ? formatarDataHoraCurta(i.checkin_at) : '',
    }
    colunasExtras.forEach((label, idx) => {
      linha[`extra_${idx}`] = i.dados_extras?.[label] ?? ''
    })
    for (const s of sessoes) {
      linha[`sessao_${s.id}`] = marcadas.has(s.id) ? 'Sim' : ''
    }
    ws.addRow(linha)
  }

  // Estilo do header: negrito, texto branco, fundo cor da marca.
  const header = ws.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E5C56' } }
  header.alignment = { vertical: 'middle' }
  header.height = 20

  const buffer = await workbook.xlsx.writeBuffer()
  const nomeArquivo = `inscritos-${evento.slug}.xlsx`

  return new Response(buffer, {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="${nomeArquivo}"`,
    },
  })
}
```

- [ ] **Step 2: Atualizar o rótulo do botão de export**

Em `app/eventos/[id]/(gerir)/inscritos/page.tsx`, o botão diz "⬇ Exportar CSV".
Troca o texto para "⬇ Exportar XLSX" (o `href` continua o mesmo).

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 4: Verificação manual do download**

Descrição do esperado (rodar `npm run dev`, abrir um evento com inscritos e sessões,
clicar "Exportar XLSX"): baixa `inscritos-<slug>.xlsx`; abre no Excel/LibreOffice com
header verde `#0E5C56` em negrito branco, primeira linha congelada, e uma coluna por
sessão com "Sim" onde o inscrito marcou.

- [ ] **Step 5: Commit**

```bash
git add "app/eventos/[id]/(gerir)/inscritos/export/route.ts" "app/eventos/[id]/(gerir)/inscritos/page.tsx"
git commit -m "feat: export XLSX estilizado com coluna por sessao (substitui CSV)"
```

---

### Task 5: Verificação final

**Files:** nenhum (só rodar).

- [ ] **Step 1: Typecheck completo**

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 2: Testes**

Run: `npx vitest run`
Expected: todos passam (inclui `lib/sessoes.test.ts` e `lib/email.test.ts`).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build conclui sem erro (valida que o route handler com exceljs empacota no runtime Node).
```
