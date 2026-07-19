# Inscrito manual, popup de detalhe e relatório por sessão — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o organizador cadastre um inscrito manualmente (dados + campos extras + sessões, com envio do bilhete), ver o detalhe completo de cada inscrito num popup, e reduzir a aba Programação a contagem por sessão.

**Architecture:** Extrai a validação de inscrição (hoje só no fluxo público) para `lib/inscricao.ts`, reusada pela nova action `adicionarInscrito`. O `InscritosClient` ganha dois modais (adicionar / detalhe) e uma action de leitura de sessões por inscrito. A página de sessões perde a lista de nomes.

**Tech Stack:** Next.js 14 (App Router, Server Components + Server Actions), Supabase (admin client via service_role em actions), Tailwind, Vitest.

## Global Constraints

- UI e microcopy em **pt-BR**, com acentuação correta.
- Server Actions com `'use server'`; escrita usa `createAdminSupabase` (service_role nunca vai ao browser).
- Toda action de escrita guarda permissão via `acessoEvento` antes de tocar dados.
- Componentes com interatividade levam `'use client'`; o resto fica Server Component.
- Validação de inscrição manual = **mesmas regras do fluxo público**: nome/e-mail presentes, e-mail válido, campos extras obrigatórios, CPF/telefone válidos, duplicado por e-mail ou CPF (ignorando cancelados), `vagas_max` do evento.
- Envio de e-mail não bloqueia o sucesso da operação (loga a falha).
- Commits **sem** trailer `Co-Authored-By`.

---

### Task 1: Extrair validação de inscrição para `lib/inscricao.ts`

Refactor puro + I/O de leitura, sem mudar o comportamento do fluxo público. Duas funções: uma pura (valida FormData contra o evento) e uma de leitura (checa duplicado/vagas). Depois `inscrever` passa a usá-las.

**Files:**
- Create: `lib/inscricao.ts`
- Create: `lib/inscricao.test.ts`
- Modify: `app/e/[slug]/inscricao/actions.ts`

**Interfaces:**
- Consumes: `Evento`, `CampoExtra` de `@/types`; `cpfValido`, `telefoneValido`, `emailValido` de `@/lib/mascaras`; `createAdminSupabase` de `@/lib/supabase`.
- Produces:
  - `validarDadosInscricao(evento: Evento, formData: FormData): ResultadoValidacao`
    ```ts
    type ResultadoValidacao =
      | { ok: false; erro: string }
      | { ok: true; nome: string; email: string; dadosExtras: Record<string,string>; cpfLabel: string | null; cpfDigitos: string }
    ```
  - `checarDuplicadoEVagas(admin: ReturnType<typeof createAdminSupabase>, evento: Evento, email: string, cpfLabel: string | null, cpfDigitos: string): Promise<{ ok: boolean; erro?: string }>`

- [ ] **Step 1: Write the failing test**

`lib/inscricao.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { validarDadosInscricao } from './inscricao'
import { Evento, CampoExtra } from '@/types'

function fd(entries: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(entries)) f.append(k, v)
  return f
}

const base = (campos: CampoExtra[]): Evento =>
  ({ id: 'e1', campos_extras: campos } as unknown as Evento)

describe('validarDadosInscricao', () => {
  it('reprova nome ou e-mail ausente', () => {
    const r = validarDadosInscricao(base([]), fd({ nome: '', email: 'a@b.com' }))
    expect(r.ok).toBe(false)
  })

  it('reprova e-mail invalido', () => {
    const r = validarDadosInscricao(base([]), fd({ nome: 'Ana', email: 'invalido' }))
    expect(r.ok).toBe(false)
  })

  it('reprova campo extra obrigatorio vazio', () => {
    const campos: CampoExtra[] = [{ id: 'c1', label: 'Curso', tipo: 'texto', obrigatorio: true }]
    const r = validarDadosInscricao(base(campos), fd({ nome: 'Ana', email: 'a@b.com' }))
    expect(r.ok).toBe(false)
  })

  it('reprova CPF invalido e aprova valido', () => {
    const campos: CampoExtra[] = [{ id: 'c1', label: 'CPF', tipo: 'cpf', obrigatorio: true }]
    const ruim = validarDadosInscricao(base(campos), fd({ nome: 'Ana', email: 'a@b.com', extra_c1: '111.111.111-11' }))
    expect(ruim.ok).toBe(false)
    const bom = validarDadosInscricao(base(campos), fd({ nome: 'Ana', email: 'a@b.com', extra_c1: '390.533.447-05' }))
    expect(bom.ok).toBe(true)
    if (bom.ok) {
      expect(bom.cpfLabel).toBe('CPF')
      expect(bom.cpfDigitos).toBe('39053344705')
    }
  })

  it('normaliza e-mail (trim + lowercase) e coleta dados_extras por label', () => {
    const campos: CampoExtra[] = [{ id: 'c1', label: 'Curso', tipo: 'texto', obrigatorio: false }]
    const r = validarDadosInscricao(base(campos), fd({ nome: '  Ana  ', email: '  A@B.COM ', extra_c1: 'Enfermagem' }))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.email).toBe('a@b.com')
      expect(r.nome).toBe('Ana')
      expect(r.dadosExtras).toEqual({ Curso: 'Enfermagem' })
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/inscricao.test.ts`
Expected: FAIL — `validarDadosInscricao` não existe (módulo não encontrado).

- [ ] **Step 3: Write minimal implementation**

`lib/inscricao.ts` — mover a lógica de `inscrever` (linhas de coleta/validação de campos, duplicado e vagas), sem alterá-la:
```ts
import { createAdminSupabase } from '@/lib/supabase'
import { cpfValido, telefoneValido, emailValido } from '@/lib/mascaras'
import { Evento } from '@/types'

export type ResultadoValidacao =
  | { ok: false; erro: string }
  | {
      ok: true
      nome: string
      email: string
      dadosExtras: Record<string, string>
      cpfLabel: string | null
      cpfDigitos: string
    }

/** Valida os dados de uma inscrição contra o evento. Pura (sem I/O). */
export function validarDadosInscricao(evento: Evento, formData: FormData): ResultadoValidacao {
  const nome = String(formData.get('nome') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!nome || !email) return { ok: false, erro: 'Preencha nome e e-mail.' }
  if (!emailValido(email)) return { ok: false, erro: 'E-mail inválido.' }

  const dadosExtras: Record<string, string> = {}
  let cpfLabel: string | null = null
  let cpfDigitos = ''
  for (const campo of evento.campos_extras ?? []) {
    if (campo.fixo) continue
    const valor = String(formData.get(`extra_${campo.id}`) ?? '').trim()
    if (valor) dadosExtras[campo.label] = valor
    if (campo.obrigatorio && !valor) {
      return { ok: false, erro: `Preencha o campo "${campo.label}".` }
    }
    if (campo.tipo === 'cpf' && valor) {
      if (!cpfValido(valor)) return { ok: false, erro: `CPF inválido em "${campo.label}".` }
      cpfLabel = campo.label
      cpfDigitos = valor.replace(/\D/g, '')
    }
    if (campo.tipo === 'telefone' && valor && !telefoneValido(valor)) {
      return { ok: false, erro: `Telefone inválido em "${campo.label}".` }
    }
  }
  return { ok: true, nome, email, dadosExtras, cpfLabel, cpfDigitos }
}

/** Checa duplicado (e-mail/CPF) e vagas restantes. Lê inscricoes existentes. */
export async function checarDuplicadoEVagas(
  admin: ReturnType<typeof createAdminSupabase>,
  evento: Evento,
  email: string,
  cpfLabel: string | null,
  cpfDigitos: string
): Promise<{ ok: boolean; erro?: string }> {
  if (evento.vagas_max != null) {
    const { count } = await admin
      .from('inscricoes')
      .select('id', { count: 'exact', head: true })
      .eq('evento_id', evento.id)
      .neq('status', 'cancelado')
    if ((count ?? 0) >= evento.vagas_max) {
      return { ok: false, erro: 'As vagas para este evento se esgotaram.' }
    }
  }

  const { data: existentes } = await admin
    .from('inscricoes')
    .select('email, dados_extras')
    .eq('evento_id', evento.id)
    .neq('status', 'cancelado')

  for (const insc of (existentes ?? []) as { email: string; dados_extras: Record<string, string> | null }[]) {
    if (insc.email?.toLowerCase() === email) {
      return { ok: false, erro: 'Este e-mail já está inscrito neste evento.' }
    }
    if (cpfLabel && cpfDigitos) {
      const cpfExistente = String(insc.dados_extras?.[cpfLabel] ?? '').replace(/\D/g, '')
      if (cpfExistente && cpfExistente === cpfDigitos) {
        return { ok: false, erro: 'Este CPF já está inscrito neste evento.' }
      }
    }
  }
  return { ok: true }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/inscricao.test.ts`
Expected: PASS (5 testes).

Nota: se `390.533.447-05` não passar em `cpfValido`, trocar por qualquer CPF válido de teste — rodar `node -e "const {cpfValido}=require('./lib/mascaras'); ..."` não funciona (TS); em vez disso ajustar no teste um CPF que `cpfValido` aceite (gerar mentalmente com dígitos verificadores corretos).

- [ ] **Step 5: Refatorar `inscrever` para usar os helpers**

Em `app/e/[slug]/inscricao/actions.ts`, substituir o bloco de coleta/validação (nome/email/campos extras) e o bloco de duplicado/vagas pelas chamadas:
```ts
import { validarDadosInscricao, checarDuplicadoEVagas } from '@/lib/inscricao'
// ...
  const validado = validarDadosInscricao(evento, formData)
  if (!validado.ok) return { ok: false, erro: validado.erro }
  const { nome, email, dadosExtras, cpfLabel, cpfDigitos } = validado

  const dup = await checarDuplicadoEVagas(supabase, evento, email, cpfLabel, cpfDigitos)
  if (!dup.ok) return { ok: false, erro: dup.erro }
```
Manter tudo o mais (janela de inscrição, `gerarToken`, insert, `enviarIngresso`, return) igual. Remover os imports de `cpfValido/telefoneValido/emailValido` que ficarem sem uso.

- [ ] **Step 6: Verificar fluxo público intacto**

Run: `npx tsc --noEmit && npx vitest run`
Expected: typecheck limpo, toda a suíte passa.

- [ ] **Step 7: Commit**

```bash
git add lib/inscricao.ts lib/inscricao.test.ts "app/e/[slug]/inscricao/actions.ts"
git commit -m "refactor: extrai validacao de inscricao para lib/inscricao"
```

---

### Task 2: Action `adicionarInscrito`

Cria a inscrição manual no servidor: valida (reuso Task 1), insere, grava sessões, envia bilhete.

**Files:**
- Modify: `app/eventos/[id]/(gerir)/inscritos/actions.ts`

**Interfaces:**
- Consumes: `acessoEvento` de `@/lib/acesso`; `createAdminSupabase` de `@/lib/supabase`; `gerarToken` de `@/lib/qr`; `enviarIngresso` de `@/lib/email`; `formatarDataHora`, `rotuloCidadeFuso` de `@/lib/datas`; `gravarMarcacoes` de `@/lib/marcacoes`; `validarDadosInscricao`, `checarDuplicadoEVagas` de `@/lib/inscricao`; `Evento` de `@/types`; `AcaoResult` (já definido no arquivo).
- Produces:
  - `adicionarInscrito(eventoId: string, formData: FormData, sessaoIds: string[]): Promise<AcaoResult & { aviso?: string }>`

- [ ] **Step 1: Implementar a action**

Adicionar ao final de `actions.ts`:
```ts
import { gerarToken } from '@/lib/qr'
import { gravarMarcacoes } from '@/lib/marcacoes'
import { validarDadosInscricao, checarDuplicadoEVagas } from '@/lib/inscricao'

/**
 * Cadastra um inscrito manualmente (balcão). Mesmas validações do fluxo público
 * (campos extras, duplicado, vagas). Grava as sessões escolhidas e envia o bilhete.
 * Só dono/editor.
 */
export async function adicionarInscrito(
  eventoId: string,
  formData: FormData,
  sessaoIds: string[]
): Promise<AcaoResult & { aviso?: string }> {
  const acesso = await acessoEvento(eventoId)
  if (!acesso.podeEditar) {
    return { ok: false, erro: 'Você não tem permissão para adicionar inscritos neste evento.' }
  }

  const admin = createAdminSupabase()
  const { data: evRow } = await admin.from('eventos').select('*').eq('id', eventoId).single()
  if (!evRow) return { ok: false, erro: 'Evento não encontrado.' }
  const evento = evRow as Evento

  const validado = validarDadosInscricao(evento, formData)
  if (!validado.ok) return { ok: false, erro: validado.erro }
  const { nome, email, dadosExtras, cpfLabel, cpfDigitos } = validado

  const dup = await checarDuplicadoEVagas(admin, evento, email, cpfLabel, cpfDigitos)
  if (!dup.ok) return { ok: false, erro: dup.erro }

  const token = gerarToken()
  const { data: inserida, error } = await admin
    .from('inscricoes')
    .insert({ evento_id: eventoId, nome, email, dados_extras: dadosExtras, status: 'inscrito', token })
    .select('id')
    .single()
  if (error || !inserida) return { ok: false, erro: 'Não foi possível adicionar o inscrito.' }

  const rejeitadas = await gravarMarcacoes(
    admin,
    eventoId,
    (inserida as { id: string }).id,
    sessaoIds.map(String),
    evento.dias ?? []
  )

  try {
    await enviarIngresso({
      para: email,
      nomeParticipante: nome,
      nomeEvento: evento.nome,
      dataEvento: `${formatarDataHora(evento.data_hora, evento.fuso)} (${rotuloCidadeFuso(evento.fuso)})`,
      local: evento.local ?? '',
      token,
    })
  } catch (e) {
    console.error('Falha ao enviar bilhete do inscrito manual:', e)
  }

  revalidatePath(`/eventos/${eventoId}/inscritos`)
  if (rejeitadas.length > 0) {
    return { ok: true, aviso: `Inscrito adicionado. Sessões lotadas não incluídas: ${rejeitadas.join(', ')}.` }
  }
  return { ok: true }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: limpo.

- [ ] **Step 3: Commit**

```bash
git add "app/eventos/[id]/(gerir)/inscritos/actions.ts"
git commit -m "feat: action adicionarInscrito (cadastro manual + sessoes + bilhete)"
```

---

### Task 3: Action `sessoesDoInscrito`

Leitura das sessões marcadas por um inscrito, para o popup de detalhe.

**Files:**
- Modify: `app/eventos/[id]/(gerir)/inscritos/actions.ts`

**Interfaces:**
- Consumes: `acessoEvento`; `createAdminSupabase`; `todasSessoes` de `@/lib/sessoes`; `Evento` de `@/types`.
- Produces:
  - `sessoesDoInscrito(eventoId: string, inscricaoId: string): Promise<{ ok: boolean; sessoes?: SessaoResumo[]; erro?: string }>`
  - `type SessaoResumo = { id: string; titulo: string; hora_inicio: string }`

- [ ] **Step 1: Implementar a action**

```ts
import { todasSessoes } from '@/lib/sessoes'

export interface SessaoResumo {
  id: string
  titulo: string
  hora_inicio: string
}

/** Sessões marcadas por um inscrito (para o popup de detalhe). Requer podeVer. */
export async function sessoesDoInscrito(
  eventoId: string,
  inscricaoId: string
): Promise<{ ok: boolean; sessoes?: SessaoResumo[]; erro?: string }> {
  const acesso = await acessoEvento(eventoId)
  if (!acesso.podeVer) return { ok: false, erro: 'Sem acesso.' }

  const admin = createAdminSupabase()
  const [{ data: evRow }, { data: marc }] = await Promise.all([
    admin.from('eventos').select('dias').eq('id', eventoId).single(),
    admin.from('inscricoes_sessoes').select('sessao_id').eq('inscricao_id', inscricaoId).eq('evento_id', eventoId),
  ])
  if (!evRow) return { ok: false, erro: 'Evento não encontrado.' }

  const dias = (evRow as Pick<Evento, 'dias'>).dias ?? []
  const porId = new Map(todasSessoes(dias).map((s) => [s.id, s]))
  const ids = (marc ?? []).map((r) => (r as { sessao_id: string }).sessao_id)

  const sessoes: SessaoResumo[] = ids
    .map((id) => porId.get(id))
    .filter((s): s is NonNullable<typeof s> => !!s)
    .map((s) => ({ id: s.id, titulo: s.titulo, hora_inicio: s.hora_inicio }))
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))

  return { ok: true, sessoes }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: limpo.

- [ ] **Step 3: Commit**

```bash
git add "app/eventos/[id]/(gerir)/inscritos/actions.ts"
git commit -m "feat: action sessoesDoInscrito para o detalhe do inscrito"
```

---

### Task 4: Programação — só contagem

Remove a lista de nomes; mantém contagem por sessão.

**Files:**
- Modify: `app/eventos/[id]/(gerir)/sessoes/page.tsx`

**Interfaces:**
- Nenhuma nova. Continua usando `todasSessoes`? Não — a página já itera por `dias`. Só reduz o select e o render.

- [ ] **Step 1: Reduzir o select e remover nomes**

Trocar o select das marcações para contar apenas:
```ts
  const { data: marc } = await supabase
    .from('inscricoes_sessoes')
    .select('sessao_id')
    .eq('evento_id', ev.id)

  const contagem = new Map<string, number>()
  for (const row of (marc ?? []) as { sessao_id: string }[]) {
    contagem.set(row.sessao_id, (contagem.get(row.sessao_id) ?? 0) + 1)
  }
```
Ajustar o texto do topo:
```tsx
      <p className="text-muted -mt-2 mb-6">
        Quantas pessoas marcaram cada sessão. Os nomes ficam no detalhe de cada
        inscrito, na aba <span className="font-semibold text-ink">Gerenciamento</span>.
      </p>
```
Passar `total={contagem.get(s.id) ?? 0}` para `SessaoRelatorio` e reescrever o componente sem a `<ul>` de pessoas:
```tsx
function SessaoRelatorio({ s, total }: { s: Sessao; total: number }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="badge badge-inscrito">{rotuloTipo(s)}</span>
        <span className="font-semibold">{s.titulo}</span>
        <span className="text-sm text-muted">
          {s.hora_inicio} · {s.vagas_max != null ? `${total} de ${s.vagas_max}` : `${total} marcações`}
        </span>
      </div>
    </div>
  )
}
```
Atualizar as duas chamadas de `<SessaoRelatorio ... pessoas={...} />` para `total={contagem.get(s.id) ?? 0}`.

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx next lint --file "app/eventos/[id]/(gerir)/sessoes/page.tsx"`
Expected: limpo.

- [ ] **Step 3: Commit**

```bash
git add "app/eventos/[id]/(gerir)/sessoes/page.tsx"
git commit -m "feat: Programacao mostra so contagem por sessao (nomes vao pro detalhe do inscrito)"
```

---

### Task 5: Modal de detalhe do inscrito

Popup com dados completos, campos extras, sessões (carregadas sob demanda) e ações.

**Files:**
- Create: `app/eventos/[id]/(gerir)/inscritos/DetalheInscritoModal.tsx`

**Interfaces:**
- Consumes: `Inscricao` de `@/types`; `Badge` de `@/components/ui/Badge`; `sessoesDoInscrito`, `SessaoResumo`, `AcaoResult`, `marcarPresenca`, `desfazerPresenca`, `cancelarInscricao`, `reenviarBilhete` de `./actions`; `FUSO_BR`, `formatarHora` de `@/lib/datas`.
- Produces:
  - `DetalheInscritoModal({ eventoId, inscricao, podeEditar, podeCheckin, onFechar, onResultado }: DetalheProps)`
    ```ts
    interface DetalheProps {
      eventoId: string
      inscricao: Inscricao
      podeEditar: boolean
      podeCheckin: boolean
      onFechar: () => void
      onResultado: (res: AcaoResult, sucesso: string) => void
    }
    ```

- [ ] **Step 1: Criar o componente**

```tsx
'use client'

import { useEffect, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/Badge'
import { FUSO_BR, formatarHora } from '@/lib/datas'
import { Inscricao } from '@/types'
import {
  sessoesDoInscrito,
  marcarPresenca,
  desfazerPresenca,
  cancelarInscricao,
  reenviarBilhete,
  type SessaoResumo,
  type AcaoResult,
} from './actions'

interface DetalheProps {
  eventoId: string
  inscricao: Inscricao
  podeEditar: boolean
  podeCheckin: boolean
  onFechar: () => void
  onResultado: (res: AcaoResult, sucesso: string) => void
}

function dataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: FUSO_BR,
  })
}

export function DetalheInscritoModal({
  eventoId, inscricao, podeEditar, podeCheckin, onFechar, onResultado,
}: DetalheProps) {
  const [sessoes, setSessoes] = useState<SessaoResumo[] | null>(null)
  const [pendente, startTransition] = useTransition()

  useEffect(() => {
    let vivo = true
    sessoesDoInscrito(eventoId, inscricao.id).then((r) => {
      if (vivo) setSessoes(r.ok ? (r.sessoes ?? []) : [])
    })
    return () => { vivo = false }
  }, [eventoId, inscricao.id])

  function rodar(fn: () => Promise<AcaoResult>, sucesso: string) {
    startTransition(async () => {
      const res = await fn()
      onResultado(res, sucesso)
      if (res.ok) onFechar()
    })
  }

  const cancelado = inscricao.status === 'cancelado'
  const presente = inscricao.status === 'presente'
  const extras = Object.entries(inscricao.dados_extras ?? {})

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4" onClick={onFechar}>
      <div
        className="bg-surface text-ink w-full max-w-lg rounded-lg mt-[8vh] max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-line flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold break-words">{inscricao.nome}</h2>
            <p className="text-sm text-muted break-words">{inscricao.email}</p>
          </div>
          <button onClick={onFechar} className="text-muted px-2 text-lg shrink-0" aria-label="Fechar">✕</button>
        </div>

        <div className="p-5 grid gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge status={inscricao.status} />
            <span className="text-sm text-muted">Inscrição {dataHora(inscricao.created_at)}</span>
            {presente && inscricao.checkin_at && (
              <span className="text-sm text-muted">Entrou às {formatarHora(inscricao.checkin_at)}</span>
            )}
          </div>

          {extras.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wide text-muted font-semibold mb-1.5">Dados</h3>
              <dl className="grid gap-1 text-sm">
                {extras.map(([label, valor]) => (
                  <div key={label} className="flex gap-2">
                    <dt className="text-muted min-w-[120px]">{label}</dt>
                    <dd className="font-medium break-words">{valor}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div>
            <h3 className="text-xs uppercase tracking-wide text-muted font-semibold mb-1.5">Sessões</h3>
            {sessoes === null ? (
              <p className="text-sm text-muted">Carregando…</p>
            ) : sessoes.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma sessão marcada.</p>
            ) : (
              <ul className="grid gap-1 text-sm">
                {sessoes.map((s) => (
                  <li key={s.id} className="flex gap-2">
                    <span className="text-muted tabular-nums">{s.hora_inicio}</span>
                    <span>{s.titulo}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {(podeEditar || podeCheckin) && !cancelado && (
          <div className="p-5 border-t border-line flex flex-wrap gap-2">
            {podeCheckin && !presente && (
              <button disabled={pendente} onClick={() => rodar(() => marcarPresenca(eventoId, inscricao.id), 'Presença confirmada.')}
                className="btn btn-primary disabled:opacity-40">✓ Confirmar presença</button>
            )}
            {podeCheckin && presente && (
              <button disabled={pendente} onClick={() => rodar(() => desfazerPresenca(eventoId, inscricao.id), 'Check-in desfeito.')}
                className="btn-ghost rounded-md px-4 py-2 text-sm disabled:opacity-40">↩ Desfazer check-in</button>
            )}
            {podeEditar && (
              <button disabled={pendente} onClick={() => rodar(() => reenviarBilhete(eventoId, inscricao.id), 'Bilhete reenviado por e-mail.')}
                className="btn-ghost rounded-md px-4 py-2 text-sm disabled:opacity-40">✉ Reenviar bilhete</button>
            )}
            {podeEditar && (
              <button disabled={pendente} onClick={() => rodar(() => cancelarInscricao(eventoId, inscricao.id), 'Inscrição cancelada.')}
                className="rounded-md px-4 py-2 text-sm text-error hover:bg-error/10 disabled:opacity-40">✕ Cancelar inscrição</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx next lint --file "app/eventos/[id]/(gerir)/inscritos/DetalheInscritoModal.tsx"`
Expected: limpo.

- [ ] **Step 3: Commit**

```bash
git add "app/eventos/[id]/(gerir)/inscritos/DetalheInscritoModal.tsx"
git commit -m "feat: modal de detalhe do inscrito (dados, sessoes, acoes)"
```

---

### Task 6: Modal de adicionar inscrito (2 etapas)

Form de dados (reusa máscaras/campos) + seleção de sessões.

**Files:**
- Create: `app/eventos/[id]/(gerir)/inscritos/AdicionarInscritoModal.tsx`

**Interfaces:**
- Consumes: `Evento`, `CampoExtra`, `Sessao`, `Dia` de `@/types`; `comCamposFixos` de `@/lib/campos`; `formatarCpf`, `formatarTelefone`, `cpfValido`, `telefoneValido`, `emailValido` de `@/lib/mascaras`; `todasSessoes`, `rotuloTipo` de `@/lib/sessoes`; `Select` de `@/components/ui/Select`; `adicionarInscrito`, `AcaoResult` de `./actions`.
- Produces:
  - `AdicionarInscritoModal({ eventoId, camposExtras, dias, onFechar, onResultado }: AdicionarProps)`
    ```ts
    interface AdicionarProps {
      eventoId: string
      camposExtras: CampoExtra[]
      dias: Dia[]
      onFechar: () => void
      onResultado: (res: AcaoResult & { aviso?: string }, sucesso: string) => void
    }
    ```

- [ ] **Step 1: Criar o componente**

Segue o padrão de validação/máscara do `InscricaoForm` (borda vermelha em obrigatório vazio / formato inválido), mas monta o `FormData` manualmente e chama `adicionarInscrito`. Etapa 2 lista `todasSessoes(dias)` com checkbox (pula `sem_inscricao`).

```tsx
'use client'

import { useMemo, useState, useTransition } from 'react'
import { Select } from '@/components/ui/Select'
import { CampoExtra, Dia, Sessao } from '@/types'
import { comCamposFixos } from '@/lib/campos'
import { formatarCpf, formatarTelefone, cpfValido, telefoneValido, emailValido } from '@/lib/mascaras'
import { todasSessoes, rotuloTipo } from '@/lib/sessoes'
import { adicionarInscrito, type AcaoResult } from './actions'

interface AdicionarProps {
  eventoId: string
  camposExtras: CampoExtra[]
  dias: Dia[]
  onFechar: () => void
  onResultado: (res: AcaoResult & { aviso?: string }, sucesso: string) => void
}

export function AdicionarInscritoModal({ eventoId, camposExtras, dias, onFechar, onResultado }: AdicionarProps) {
  const campos = useMemo(() => comCamposFixos(camposExtras), [camposExtras])
  const sessoes = useMemo(() => todasSessoes(dias).filter((s) => !s.sem_inscricao), [dias])

  const [etapa, setEtapa] = useState<1 | 2>(1)
  const [valores, setValores] = useState<Record<string, string>>({})
  const [tocados, setTocados] = useState<Record<string, boolean>>({})
  const [erro, setErro] = useState<string | null>(null)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [pendente, startTransition] = useTransition()

  const ehObrigatorio = (c: CampoExtra) => !!c.fixo || !!c.obrigatorio
  const temFormato = (c: CampoExtra) => c.tipo === 'cpf' || c.tipo === 'telefone' || c.fixo === 'email'

  function formatoValido(c: CampoExtra, v: string): boolean {
    if (c.fixo === 'email') return emailValido(v)
    if (c.tipo === 'cpf') return cpfValido(v)
    if (c.tipo === 'telefone') return telefoneValido(v)
    return true
  }

  function aoDigitar(c: CampoExtra, bruto: string) {
    const v = c.tipo === 'cpf' ? formatarCpf(bruto) : c.tipo === 'telefone' ? formatarTelefone(bruto) : bruto
    setValores((m) => ({ ...m, [c.id]: v }))
  }

  function validarEtapa1(): boolean {
    const reprovados: string[] = []
    for (const c of campos) {
      const v = (valores[c.id] ?? '').trim()
      if (!v) { if (ehObrigatorio(c)) reprovados.push(c.id); continue }
      if (!formatoValido(c, v)) reprovados.push(c.id)
    }
    if (reprovados.length > 0) {
      setTocados((t) => ({ ...t, ...Object.fromEntries(reprovados.map((id) => [id, true])) }))
      return false
    }
    return true
  }

  function continuar() {
    if (!validarEtapa1()) return
    if (sessoes.length === 0) { submeter(); return }
    setEtapa(2)
  }

  function toggleSessao(id: string) {
    setSel((prev) => {
      const p = new Set(prev)
      if (p.has(id)) p.delete(id); else p.add(id)
      return p
    })
  }

  function submeter() {
    const fd = new FormData()
    for (const c of campos) {
      const name = c.fixo ?? `extra_${c.id}`
      fd.append(name, (valores[c.id] ?? '').trim())
    }
    setErro(null)
    startTransition(async () => {
      const res = await adicionarInscrito(eventoId, fd, [...sel])
      if (res.ok) {
        onResultado(res, res.aviso ?? 'Inscrito adicionado e bilhete enviado.')
        onFechar()
      } else {
        setErro(res.erro ?? 'Não foi possível adicionar.')
        setEtapa(1) // erros de dados/duplicado voltam pra etapa 1
      }
    })
  }

  const invalido = (c: CampoExtra): boolean => {
    const v = (valores[c.id] ?? '').trim()
    const tocado = !!tocados[c.id]
    if (!v) return tocado && ehObrigatorio(c)
    return tocado && !formatoValido(c, v)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4" onClick={onFechar}>
      <div className="bg-surface text-ink w-full max-w-lg rounded-lg mt-[8vh] max-h-[82vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-line flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">
            Adicionar inscrito {sessoes.length > 0 && <span className="text-sm text-muted font-normal">· Etapa {etapa}/2</span>}
          </h2>
          <button onClick={onFechar} className="text-muted px-2 text-lg" aria-label="Fechar">✕</button>
        </div>

        {etapa === 1 && (
          <div className="p-5 grid gap-4">
            {campos.map((c) => (
              <div key={c.id}>
                <label className="block text-[13px] font-semibold mb-1.5">
                  {c.label}{ehObrigatorio(c) && <span className="text-error"> *</span>}
                </label>
                {c.tipo === 'opcoes' ? (
                  <Select
                    name={`extra_${c.id}`}
                    opcoes={c.opcoes ?? []}
                    value={valores[c.id] ?? ''}
                    onChange={(v) => setValores((m) => ({ ...m, [c.id]: v }))}
                    onBlur={() => setTocados((t) => ({ ...t, [c.id]: true }))}
                    invalido={invalido(c)}
                  />
                ) : (
                  <input
                    className={`input ${invalido(c) ? 'border-error focus:border-error focus:ring-error/20' : ''}`}
                    type={c.tipo === 'numero' ? 'number' : 'text'}
                    inputMode={c.fixo === 'email' ? 'email' : c.tipo === 'cpf' || c.tipo === 'telefone' ? 'numeric' : undefined}
                    autoCapitalize={c.fixo === 'email' ? 'none' : undefined}
                    placeholder={c.fixo === 'nome' ? 'Nome completo' : c.fixo === 'email' ? 'email@exemplo.com'
                      : c.tipo === 'cpf' ? '000.000.000-00' : c.tipo === 'telefone' ? '(00) 00000-0000' : undefined}
                    value={valores[c.id] ?? ''}
                    onChange={(e) => aoDigitar(c, e.target.value)}
                    onBlur={() => setTocados((t) => ({ ...t, [c.id]: true }))}
                    aria-invalid={invalido(c)}
                  />
                )}
              </div>
            ))}
            {erro && <p className="text-error text-sm">{erro}</p>}
            <button onClick={continuar} disabled={pendente} className="btn btn-primary disabled:opacity-40">
              {sessoes.length > 0 ? 'Continuar' : pendente ? 'Adicionando…' : 'Adicionar inscrito'}
            </button>
          </div>
        )}

        {etapa === 2 && (
          <div className="p-5 grid gap-3">
            <p className="text-sm text-muted">Marque as sessões que a pessoa vai participar.</p>
            {sessoes.map((s) => (
              <label key={s.id} className="card p-3 flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={sel.has(s.id)} onChange={() => toggleSessao(s.id)} className="w-4 h-4" />
                <span className="flex-1">
                  <span className="badge badge-inscrito mr-2">{rotuloTipo(s)}</span>
                  <span className="font-medium">{s.titulo}</span>
                  <span className="text-sm text-muted ml-2">{s.hora_inicio}</span>
                </span>
              </label>
            ))}
            {erro && <p className="text-error text-sm">{erro}</p>}
            <div className="flex gap-2 mt-1">
              <button onClick={() => setEtapa(1)} disabled={pendente} className="btn-ghost rounded-md px-4 py-2 text-sm">← Voltar</button>
              <button onClick={submeter} disabled={pendente} className="btn btn-primary flex-1 disabled:opacity-40">
                {pendente ? 'Adicionando…' : 'Adicionar inscrito'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

Nota: `Select` (`@/components/ui/Select`) exige `name` (prop obrigatória) — passamos `name={`extra_${c.id}`}`. O valor real vem do estado controlado (`value`/`onChange`); montamos o FormData à mão em `submeter`, então o `name` é só para satisfazer a prop, não há submit de form nativo.

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit && npx next lint --file "app/eventos/[id]/(gerir)/inscritos/AdicionarInscritoModal.tsx"`
Expected: limpo.

- [ ] **Step 3: Commit**

```bash
git add "app/eventos/[id]/(gerir)/inscritos/AdicionarInscritoModal.tsx"
git commit -m "feat: modal de adicionar inscrito em 2 etapas (dados + sessoes)"
```

---

### Task 7: Ligar tudo no `InscritosClient` e `page.tsx`

Botão "+ Adicionar inscrito", abrir detalhe ao clicar na linha/card, montar os dois modais.

**Files:**
- Modify: `app/eventos/[id]/(gerir)/inscritos/page.tsx`
- Modify: `app/eventos/[id]/(gerir)/inscritos/InscritosClient.tsx`

**Interfaces:**
- Consumes: `AdicionarInscritoModal`, `DetalheInscritoModal` (Tasks 5–6); `CampoExtra`, `Dia` de `@/types`.
- Produces: `InscritosClient` passa a receber props extras:
  ```ts
  interface Props {
    eventoId: string
    inscricoes: Inscricao[]
    podeEditar: boolean
    podeCheckin: boolean
    camposExtras: CampoExtra[]   // novo
    dias: Dia[]                  // novo
  }
  ```

- [ ] **Step 1: `page.tsx` — passar campos/dias e botão**

Em `page.tsx`, o select do evento já é `select('*')`, então `ev.campos_extras` e `ev.dias` estão disponíveis. Passar ao client:
```tsx
      <InscritosClient
        eventoId={ev.id}
        inscricoes={lista}
        podeEditar={acesso.podeEditar}
        podeCheckin={podeCheckin}
        camposExtras={ev.campos_extras ?? []}
        dias={ev.dias ?? []}
      />
```
(O botão "+ Adicionar inscrito" fica dentro do client, junto da barra de busca — ver Step 2. A barra de CSV no `page.tsx` permanece.)

- [ ] **Step 2: `InscritosClient` — estado dos modais, botão, clique na linha**

Atualizar a assinatura de `Props` (add `camposExtras`, `dias`) e imports:
```tsx
import { CampoExtra, Dia, Inscricao, InscricaoStatus } from '@/types'
import { AdicionarInscritoModal } from './AdicionarInscritoModal'
import { DetalheInscritoModal } from './DetalheInscritoModal'
```
Adicionar estado no componente principal:
```tsx
  const [adicionar, setAdicionar] = useState(false)
  const [detalhe, setDetalhe] = useState<Inscricao | null>(null)
```
Adicionar o botão na barra (ao lado do filtro), visível se `podeEditar`:
```tsx
        {podeEditar && (
          <button onClick={() => setAdicionar(true)}
            className="btn btn-primary rounded-md px-3.5 py-2.5 text-sm shrink-0 whitespace-nowrap">
            + Adicionar inscrito
          </button>
        )}
```
Passar `onAbrirDetalhe={setDetalhe}` para `Linha` e `CardInscrito`; nelas, o clique na área (fora do `⋯`) chama `onAbrirDetalhe(inscricao)`. Na `<tr>`: adicionar `onClick={() => onAbrirDetalhe(inscricao)}` e `className` com `cursor-pointer`; no `<td>` do menu, manter `onClick` do botão com `e.stopPropagation()` já implícito (o botão é filho; adicionar `stopPropagation` no wrapper do menu para o clique não abrir o detalhe). No card idem.

Renderizar os modais no fim do JSX principal:
```tsx
      {adicionar && (
        <AdicionarInscritoModal
          eventoId={eventoId}
          camposExtras={camposExtras}
          dias={dias}
          onFechar={() => setAdicionar(false)}
          onResultado={mostrar}
        />
      )}
      {detalhe && (
        <DetalheInscritoModal
          eventoId={eventoId}
          inscricao={detalhe}
          podeEditar={podeEditar}
          podeCheckin={podeCheckin}
          onFechar={() => setDetalhe(null)}
          onResultado={mostrar}
        />
      )}
```
Para evitar que o clique no `⋯` (ou no menu aberto) dispare o detalhe: no `<td>`/`<div>` que envolve o menu, adicionar `onClick={(e) => e.stopPropagation()}`.

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit && npx next lint --file "app/eventos/[id]/(gerir)/inscritos/InscritosClient.tsx" --file "app/eventos/[id]/(gerir)/inscritos/page.tsx"`
Expected: limpo.

- [ ] **Step 4: Verificação manual (dev)**

Com `npm run dev` rodando, em `/eventos/<id>/inscritos`:
- "+ Adicionar inscrito" abre o modal; etapa 1 valida obrigatórios/CPF; etapa 2 lista sessões; concluir cria o inscrito (aparece na lista) e mostra banner; sessão lotada → banner com aviso; e-mail duplicado → erro na etapa 1.
- Clicar numa linha/card abre o detalhe com dados + sessões; ações funcionam e fecham o popup; `⋯` continua abrindo só o menu (não o detalhe).
- Aba Programação mostra só contagem.

- [ ] **Step 5: Commit**

```bash
git add "app/eventos/[id]/(gerir)/inscritos/InscritosClient.tsx" "app/eventos/[id]/(gerir)/inscritos/page.tsx"
git commit -m "feat: adicionar inscrito manual e detalhe do inscrito na aba Gerenciamento"
```

---

## Self-Review

**Spec coverage:**
- Adicionar inscrito manual (dados+extras, validação pública, sessões, bilhete) → Tasks 1, 2, 6, 7. ✅
- Popup de detalhe (dados, extras, status, check-in, sessões, ações; `⋯` mantido) → Tasks 3, 5, 7. ✅
- Programação só contagem → Task 4. ✅
- Refactor validação compartilhada → Task 1. ✅
- Permissões (`podeEditar` add/cancelar/reenviar; `podeCheckin` presença; `podeVer` detalhe) → Tasks 2, 3, 5, 7. ✅
- Fora de escopo (editar sessões de inscrito existente; import em massa) → não implementado. ✅

**Placeholder scan:** sem TBD/TODO; todo passo com código concreto. A única incerteza sinalizada é a assinatura do `Select` (nota na Task 6, com fallback explícito).

**Type consistency:** `AcaoResult` reusado do arquivo de actions; `adicionarInscrito` retorna `AcaoResult & { aviso?: string }` e o `onResultado` do modal de adicionar aceita esse mesmo tipo; `SessaoResumo` definido na Task 3 e consumido na Task 5; `Props` do `InscritosClient` estendido na Task 7 com `camposExtras`/`dias`, alimentados pelo `page.tsx`.
