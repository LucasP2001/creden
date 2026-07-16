# Editar evento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir editar os campos de um evento já criado via `/eventos/[id]/editar`, reaproveitando o form de criação.

**Architecture:** O form de criar (`NovoEventoForm`) é generalizado num `EventoForm` parametrizado (`modo` + `evento?`), servindo criar e editar. Uma nova rota Server Component busca o evento (guarda de dono) e renderiza o form em modo editar. Uma action `atualizarEvento` faz o update dos campos e, opcionalmente, troca a capa. A lógica de upload de capa — hoje duplicada em 3 lugares — é extraída para `lib/capa.ts`, com as partes puras (path + URL) testadas por vitest.

**Tech Stack:** Next.js 14 (App Router, Server Actions), Supabase (DB + Storage + RLS), TypeScript, vitest.

## Global Constraints

- UI e microcopy em **pt-BR**. Acentuação correta sempre.
- Server actions usam `createServerSupabase()` de `lib/supabase.ts` (importa `next/headers`).
- RLS já força dono; guardas de autorização são defesa extra + erro claro, não substituem RLS.
- Slug **não** é editável após criação (protege links públicos já compartilhados).
- Capa é **opcional**; falha de upload nunca bloqueia o save dos demais campos.
- Valor no form é em **reais** (input) e no banco em **centavos** (`Math.round(reais * 100)`).
- Testes de lógica pura via vitest (`npm test`); I/O verificado por `npm run build` + smoke manual no dev.
- Commits sem trailer de co-autoria.

---

### Task 1: Extrair helper `lib/capa.ts` (path/URL puros + upload)

Remove a duplicação de upload de capa entre `criarEvento`, `trocarCapa` e a futura `atualizarEvento`. Partes puras (montar path e URL com cache-bust) ficam testáveis; o upload (I/O) fica numa função fina que as usa.

**Files:**
- Create: `lib/capa.ts`
- Test: `lib/capa.test.ts`

**Interfaces:**
- Consumes: `extensaoImagem`, `validarImagem` de `lib/imagem.ts`.
- Produces:
  - `capaPath(userId: string, eventoId: string, mimeType: string): string` — retorna `${userId}/${eventoId}.${ext}`.
  - `capaUrlComBust(publicUrl: string, agora?: number): string` — retorna `${publicUrl}?v=${agora}`.
  - `uploadCapa(supabase, userId, eventoId, capa: FormDataEntryValue | null): Promise<string | null>` — valida, faz upload (upsert) e retorna a URL pública com cache-bust; `null` se não houver arquivo ou se falhar.

- [ ] **Step 1: Write the failing test**

`lib/capa.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { capaPath, capaUrlComBust } from './capa'

describe('capaPath', () => {
  it('monta {userId}/{eventoId}.{ext} a partir do mime', () => {
    expect(capaPath('u1', 'e1', 'image/png')).toBe('u1/e1.png')
    expect(capaPath('u1', 'e1', 'image/webp')).toBe('u1/e1.webp')
    expect(capaPath('u1', 'e1', 'image/jpeg')).toBe('u1/e1.jpg')
  })
})

describe('capaUrlComBust', () => {
  it('acrescenta ?v=timestamp', () => {
    expect(capaUrlComBust('https://x/eventos-capas/u1/e1.png', 123)).toBe(
      'https://x/eventos-capas/u1/e1.png?v=123'
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/capa.test.ts`
Expected: FAIL — `Failed to resolve import "./capa"` / função não definida.

- [ ] **Step 3: Write minimal implementation**

`lib/capa.ts`:
```ts
import { extensaoImagem, validarImagem } from '@/lib/imagem'
import type { createServerSupabase } from '@/lib/supabase'

const BUCKET = 'eventos-capas'

/** Path do objeto no Storage: {userId}/{eventoId}.{ext}. Puro. */
export function capaPath(userId: string, eventoId: string, mimeType: string): string {
  return `${userId}/${eventoId}.${extensaoImagem(mimeType)}`
}

/** URL pública + cache-bust para forçar refresh de CDN/navegador. Puro. */
export function capaUrlComBust(publicUrl: string, agora: number = Date.now()): string {
  return `${publicUrl}?v=${agora}`
}

/**
 * Faz upload da capa (upsert) e retorna a URL pública com cache-bust.
 * Retorna null se não houver arquivo válido ou se o upload falhar
 * (capa é opcional — o chamador decide o que fazer com null).
 */
export async function uploadCapa(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  userId: string,
  eventoId: string,
  capa: FormDataEntryValue | null
): Promise<string | null> {
  if (!(capa instanceof File) || capa.size === 0) return null
  if (validarImagem(capa)) return null

  const path = capaPath(userId, eventoId, capa.type)
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, capa, { upsert: true, contentType: capa.type })
  if (upErr) return null

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return capaUrlComBust(pub.publicUrl)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/capa.test.ts`
Expected: PASS (5 assertions).

- [ ] **Step 5: Commit**

```bash
git add lib/capa.ts lib/capa.test.ts
git commit -m "feat: helper lib/capa para upload de capa (path/url puros testados)"
```

---

### Task 2: `criarEvento` e `trocarCapa` usam o helper

Elimina a duplicação: as duas actions existentes passam a usar `uploadCapa`. Comportamento observável inalterado.

**Files:**
- Modify: `app/eventos/novo/actions.ts` (bloco de upload, ~linhas 66-78)
- Modify: `app/dashboard/actions.ts` (bloco de upload, ~linhas 25-45)

**Interfaces:**
- Consumes: `uploadCapa` de `lib/capa.ts`.

- [ ] **Step 1: Refatorar `criarEvento`**

Em `app/eventos/novo/actions.ts`, trocar o import e o bloco de capa:
```ts
import { uploadCapa } from '@/lib/capa'
// remover: import { validarImagem, extensaoImagem } from '@/lib/imagem'
```
Substituir o bloco `// Upload da capa (opcional)...` por:
```ts
  // Upload da capa (opcional). Falha aqui não bloqueia a publicação.
  const url = await uploadCapa(supabase, user.id, novo.id, formData.get('capa'))
  if (url) {
    await supabase.from('eventos').update({ imagem_url: url }).eq('id', novo.id)
  }
```

- [ ] **Step 2: Refatorar `trocarCapa`**

Em `app/dashboard/actions.ts`, trocar imports e o miolo. `trocarCapa` continua retornando erro quando não há imagem (é a ação dedicada de trocar), mas o upload em si vem do helper:
```ts
import { uploadCapa } from '@/lib/capa'
// remover: import { validarImagem, extensaoImagem } from '@/lib/imagem'
```
Substituir a partir de `const capa = formData.get('capa')` até o `update`:
```ts
  const capa = formData.get('capa')
  if (!(capa instanceof File) || capa.size === 0) {
    return { ok: false, erro: 'Escolha uma imagem.' }
  }
  const url = await uploadCapa(supabase, user.id, eventoId, capa)
  if (!url) return { ok: false, erro: 'Não foi possível enviar a imagem.' }

  const { error: dbErr } = await supabase
    .from('eventos')
    .update({ imagem_url: url })
    .eq('id', eventoId)
  if (dbErr) return { ok: false, erro: 'Não foi possível salvar a imagem.' }

  revalidatePath('/dashboard')
  return { ok: true }
```

- [ ] **Step 3: Verificar build/typecheck**

Run: `npm run typecheck && npm run build`
Expected: sem erros. `validarImagem`/`extensaoImagem` não devem mais ser importados nessas duas actions (sem "unused import").

- [ ] **Step 4: Smoke test manual**

Com `npm run dev`: criar um evento com foto e trocar a capa de um evento pelo dashboard. Ambos devem funcionar como antes.

- [ ] **Step 5: Commit**

```bash
git add app/eventos/novo/actions.ts app/dashboard/actions.ts
git commit -m "refactor: criarEvento e trocarCapa usam helper uploadCapa"
```

---

### Task 3: Generalizar o form → `EventoForm` (modo criar/editar)

Renomeia `NovoEventoForm` para `EventoForm` parametrizado. Move para `app/eventos/` (compartilhado por duas rotas). `/eventos/novo` passa a usá-lo em modo criar — sem mudança visível.

**Files:**
- Create: `app/eventos/EventoForm.tsx` (conteúdo movido/adaptado de `NovoEventoForm.tsx`)
- Delete: `app/eventos/novo/NovoEventoForm.tsx`
- Modify: `app/eventos/novo/page.tsx` (importa e usa `<EventoForm modo="criar" />`)

**Interfaces:**
- Consumes: `criarEvento` (`app/eventos/novo/actions.ts`), `atualizarEvento` (Task 5).
- Produces: componente `EventoForm({ modo, evento }: { modo: 'criar' | 'editar'; evento?: Evento })`.

- [ ] **Step 1: Criar `EventoForm.tsx`**

Copiar o conteúdo atual de `app/eventos/novo/NovoEventoForm.tsx` para `app/eventos/EventoForm.tsx` e aplicar:

Assinatura e imports:
```tsx
'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ImageUpload } from '@/components/ImageUpload'
import { CampoExtra, CampoExtraTipo, Evento } from '@/types'
import { slugify } from '@/lib/slug'
import { criarEvento } from './novo/actions'
import { atualizarEvento } from './[id]/editar/actions'

interface Props {
  modo: 'criar' | 'editar'
  evento?: Evento
}

let _id = 0
const novoCampo = (): CampoExtra => ({ id: `c${_id++}`, label: '', tipo: 'texto', obrigatorio: false })

// Converte ISO -> valor aceito por <input type="datetime-local"> (YYYY-MM-DDTHH:mm) no fuso local.
function paraDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}
```

Estado semeado de `evento`:
```tsx
export function EventoForm({ modo, evento }: Props) {
  const [nome, setNome] = useState(evento?.nome ?? '')
  const [valorPago, setValorPago] = useState((evento?.valor ?? 0) > 0)
  const [campos, setCampos] = useState<CampoExtra[]>(evento?.campos_extras ?? [])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const slug = useMemo(() => (evento ? evento.slug : slugify(nome) || 'meu-evento'), [nome, evento])
```

Submit por modo:
```tsx
  async function enviar(formData: FormData) {
    setEnviando(true)
    setErro(null)
    formData.set('campos_extras', JSON.stringify(campos))
    const res =
      modo === 'editar' && evento
        ? await atualizarEvento(evento.id, formData)
        : await criarEvento(formData)
    setEnviando(false)
    if (res && !res.ok) setErro(res.erro ?? 'Não foi possível salvar o evento.')
  }
```

`<form action={enviar} ...>`. Ajustes de campo (usar `defaultValue`):
- Descrição textarea: `defaultValue={evento?.descricao ?? ''}`.
- Data e hora: `defaultValue={evento ? paraDatetimeLocal(evento.data_hora) : undefined}`.
- Local: `defaultValue={evento?.local ?? ''}`.
- Vagas: `defaultValue={evento?.vagas_max ?? undefined}`.
- Valor (input pago): `defaultValue={evento && evento.valor > 0 ? (evento.valor / 100).toFixed(2) : undefined}`.
- `<ImageUpload name="capa" defaultPreview={evento?.imagem_url ?? null} />`.

Botão de submit e aside por modo:
```tsx
  <Button type="submit" disabled={enviando}>
    {enviando ? 'Salvando…' : modo === 'editar' ? 'Salvar alterações' : 'Publicar evento'}
  </Button>
```
No aside, o rótulo/nota mudam: em `editar`, "URL pública" fixa e nota "O link não muda ao editar." (slug read-only já é o comportamento — não há input de slug).

- [ ] **Step 2: Deletar o form antigo e apontar `/eventos/novo`**

Deletar `app/eventos/novo/NovoEventoForm.tsx`. Em `app/eventos/novo/page.tsx`, trocar:
```tsx
import { EventoForm } from '../EventoForm'
// ...
<EventoForm modo="criar" />
```
(Ajustar o path relativo conforme o import atual do arquivo.)

- [ ] **Step 3: Verificar build**

Run: `npm run typecheck && npm run build`
Expected: erro esperado e aceitável se `atualizarEvento` ainda não existe → **antecipa Task 5** ou cria stub temporário. Para manter a ordem, criar stub mínimo agora em `app/eventos/[id]/editar/actions.ts`:
```ts
'use server'
export interface AtualizarEventoResult { ok: boolean; erro?: string }
export async function atualizarEvento(_eventoId: string, _formData: FormData): Promise<AtualizarEventoResult> {
  return { ok: false, erro: 'Não implementado.' }
}
```
Depois `npm run build` deve passar.

- [ ] **Step 4: Smoke test manual**

`npm run dev` → `/eventos/novo` cria evento normalmente (comportamento idêntico ao anterior).

- [ ] **Step 5: Commit**

```bash
git add app/eventos/EventoForm.tsx app/eventos/novo/page.tsx app/eventos/[id]/editar/actions.ts
git rm app/eventos/novo/NovoEventoForm.tsx
git commit -m "refactor: NovoEventoForm vira EventoForm parametrizado (criar/editar)"
```

---

### Task 4: Rota `/eventos/[id]/editar` (page com guarda de dono)

**Files:**
- Create: `app/eventos/[id]/editar/page.tsx`

**Interfaces:**
- Consumes: `EventoForm` (Task 3), `createServerSupabase`, `notFound`.

- [ ] **Step 1: Criar a page**

`app/eventos/[id]/editar/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase'
import { Evento } from '@/types'
import { EventoForm } from '../../EventoForm'

// Tela de edição do evento (organizador dono). RLS já filtra por dono no
// select; a guarda abaixo transforma "não é seu / não existe" em 404 claro.
export default async function EditarEventoPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: evento } = await supabase
    .from('eventos')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!evento || (evento as Evento).user_id !== user.id) notFound()

  return (
    <main className="min-h-screen">
      <header className="h-14 flex items-center px-6 border-b border-line bg-surface">
        <h1 className="font-display text-lg font-semibold">Editar evento</h1>
      </header>
      <div className="max-w-[900px] mx-auto p-6">
        <EventoForm modo="editar" evento={evento as Evento} />
      </div>
    </main>
  )
}
```
(Alinhar o wrapper de layout ao de `/eventos/novo/page.tsx` para consistência visual — reutilizar o mesmo header/container que essa página usa.)

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: rota `/eventos/[id]/editar` aparece na listagem, sem erro.

- [ ] **Step 3: Smoke test manual**

`npm run dev` → abrir `/eventos/<id-de-um-evento-seu>/editar`: form pré-preenchido (nome, data, local, vagas, valor, descrição, campos extras, preview da capa). Abrir com id inexistente → 404.

- [ ] **Step 4: Commit**

```bash
git add app/eventos/[id]/editar/page.tsx
git commit -m "feat: rota /eventos/[id]/editar com guarda de dono"
```

---

### Task 5: Action `atualizarEvento` (substitui o stub)

**Files:**
- Modify: `app/eventos/[id]/editar/actions.ts` (substitui o stub da Task 3)
- Create: `app/eventos/[id]/editar/actions.test.ts` (parte pura do payload)

**Interfaces:**
- Consumes: `uploadCapa` (Task 1), `createServerSupabase`, `revalidatePath`, `redirect`.
- Produces: `atualizarEvento(eventoId: string, formData: FormData): Promise<AtualizarEventoResult>`; `montarPayloadUpdate(formData: FormData): { payload; erro? }` (parte pura, testável).

- [ ] **Step 1: Write the failing test (parte pura)**

`app/eventos/[id]/editar/actions.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { montarPayloadUpdate } from './actions'

function fd(campos: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(campos)) f.set(k, v)
  return f
}

describe('montarPayloadUpdate', () => {
  it('converte valor de reais para centavos e normaliza campos', () => {
    const { payload, erro } = montarPayloadUpdate(
      fd({ nome: 'Novo', data_hora: '2026-08-01T14:00', local: 'Sala 1', vagas_max: '30', valor: '99.90', descricao: 'oi', campos_extras: '[]' })
    )
    expect(erro).toBeUndefined()
    expect(payload.nome).toBe('Novo')
    expect(payload.valor).toBe(9990)
    expect(payload.vagas_max).toBe(30)
    expect(payload.local).toBe('Sala 1')
    expect(payload.descricao).toBe('oi')
    expect(payload.campos_extras).toEqual([])
    expect(payload).not.toHaveProperty('slug')
  })

  it('vazios viram null; grátis vira 0', () => {
    const { payload } = montarPayloadUpdate(
      fd({ nome: 'X', data_hora: '2026-08-01T14:00', local: '', vagas_max: '', valor: '0', descricao: '', campos_extras: '[]' })
    )
    expect(payload.local).toBeNull()
    expect(payload.vagas_max).toBeNull()
    expect(payload.descricao).toBeNull()
    expect(payload.valor).toBe(0)
  })

  it('erro quando nome ou data ausente', () => {
    expect(montarPayloadUpdate(fd({ nome: '', data_hora: '2026-08-01T14:00' })).erro).toBeTruthy()
    expect(montarPayloadUpdate(fd({ nome: 'X', data_hora: '' })).erro).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- app/eventos/[id]/editar/actions.test.ts`
Expected: FAIL — `montarPayloadUpdate` não exportado.

Nota: incluir `app/**/*.test.ts` no `vitest.config.ts` (`include`) para pegar este arquivo:
```ts
include: ['lib/**/*.test.ts', 'tests/**/*.test.ts', 'app/**/*.test.ts'],
```

- [ ] **Step 3: Implementar a action + parte pura**

`app/eventos/[id]/editar/actions.ts` (substitui o stub inteiro):
```ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase'
import { uploadCapa } from '@/lib/capa'
import { CampoExtra } from '@/types'

export interface AtualizarEventoResult {
  ok: boolean
  erro?: string
}

interface PayloadUpdate {
  nome: string
  descricao: string | null
  data_hora: string
  local: string | null
  vagas_max: number | null
  valor: number
  campos_extras: CampoExtra[]
}

/**
 * Monta o payload de update a partir do FormData. Puro (sem I/O) para ser
 * testável. NÃO inclui slug — o link público não muda ao editar.
 */
export function montarPayloadUpdate(
  formData: FormData
): { payload: PayloadUpdate; erro?: string } {
  const nome = String(formData.get('nome') ?? '').trim()
  const dataHora = String(formData.get('data_hora') ?? '')
  if (!nome) return { payload: {} as PayloadUpdate, erro: 'Informe o nome do evento.' }
  if (!dataHora) return { payload: {} as PayloadUpdate, erro: 'Informe a data e hora do evento.' }

  const vagasRaw = String(formData.get('vagas_max') ?? '')
  const valorRaw = String(formData.get('valor') ?? '0')
  const camposJson = String(formData.get('campos_extras') ?? '[]')
  let camposExtras: CampoExtra[] = []
  try {
    camposExtras = JSON.parse(camposJson)
  } catch {
    camposExtras = []
  }

  return {
    payload: {
      nome,
      descricao: String(formData.get('descricao') ?? '') || null,
      data_hora: new Date(dataHora).toISOString(),
      local: String(formData.get('local') ?? '') || null,
      vagas_max: vagasRaw ? Number(vagasRaw) : null,
      valor: valorRaw ? Math.round(Number(valorRaw) * 100) : 0,
      campos_extras: camposExtras,
    },
  }
}

/**
 * Atualiza um evento do organizador logado. Slug não muda. Capa é opcional.
 * RLS força dono; a guarda de user_id dá erro claro. Em sucesso, redireciona.
 */
export async function atualizarEvento(
  eventoId: string,
  formData: FormData
): Promise<AtualizarEventoResult> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, erro: 'Sessão expirada. Entre novamente.' }

  const { data: dono } = await supabase
    .from('eventos')
    .select('user_id, slug')
    .eq('id', eventoId)
    .single()
  if (!dono || dono.user_id !== user.id) {
    return { ok: false, erro: 'Evento não encontrado.' }
  }

  const { payload, erro } = montarPayloadUpdate(formData)
  if (erro) return { ok: false, erro }

  // Capa opcional: se veio arquivo novo válido, sobrescreve e inclui a URL.
  const url = await uploadCapa(supabase, user.id, eventoId, formData.get('capa'))
  const dadosUpdate = url ? { ...payload, imagem_url: url } : payload

  const { error } = await supabase.from('eventos').update(dadosUpdate).eq('id', eventoId)
  if (error) return { ok: false, erro: 'Não foi possível salvar as alterações.' }

  revalidatePath('/dashboard')
  revalidatePath(`/e/${dono.slug}`)
  redirect('/dashboard')
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — inclui os 3 casos de `montarPayloadUpdate` + os testes anteriores (slug/imagem/capa).

- [ ] **Step 5: Verificar build + smoke**

Run: `npm run build`. Depois `npm run dev`: editar cada campo de um evento e salvar; confirmar persistência na página pública (`/e/[slug]`) e no dashboard. Salvar sem trocar a capa → capa preservada. Trocar a capa pela tela de editar → nova imagem aparece (cache-bust).

- [ ] **Step 6: Commit**

```bash
git add app/eventos/[id]/editar/actions.ts app/eventos/[id]/editar/actions.test.ts vitest.config.ts
git commit -m "feat: action atualizarEvento com payload puro testado"
```

---

### Task 6: Botão "Editar" no card do dashboard

**Files:**
- Modify: `components/EventCard.tsx` (bloco de ações, ~linha 58-62)

**Interfaces:**
- Consumes: `ButtonLink`.

- [ ] **Step 1: Adicionar o link**

Em `components/EventCard.tsx`, no rodapé do card, ao lado de "Gerenciar":
```tsx
        <div className="mt-auto pt-4 flex justify-end gap-2">
          <ButtonLink variant="ghost" href={`/eventos/${evento.id}/editar`}>
            Editar
          </ButtonLink>
          <ButtonLink variant="secondary" href={`/eventos/${evento.id}/inscritos`}>
            Gerenciar
          </ButtonLink>
        </div>
```

- [ ] **Step 2: Verificar build + smoke**

Run: `npm run build`. `npm run dev` → dashboard mostra "Editar" em cada card; clicar leva a `/eventos/[id]/editar` pré-preenchido.

- [ ] **Step 3: Commit**

```bash
git add components/EventCard.tsx
git commit -m "feat: botao Editar no card do dashboard"
```

---

## Self-Review

**Spec coverage:**
- Rota `/eventos/[id]/editar` com guarda de dono → Task 4. ✓
- Form único parametrizado → Task 3. ✓
- Action `atualizarEvento` (update + capa opcional, slug travado) → Task 5. ✓
- Helper de upload compartilhado (`lib/capa.ts`) → Task 1, adotado por criar/trocar em Task 2. ✓
- Botão "Editar" no dashboard → Task 6. ✓
- Slug read-only → sem input de slug (Task 3 aside) + payload não inclui slug (Task 5). ✓
- Capa reaproveita `ImageUpload` com `defaultPreview` → Task 3. ✓
- Erro/404 → Task 4 (`notFound`) + Task 5 (guarda user_id). ✓

**Placeholder scan:** sem TBD/TODO; todo passo com código ou comando concreto. ✓

**Type consistency:** `uploadCapa`, `capaPath`, `capaUrlComBust` (Task 1) usados igual em Task 2/5. `atualizarEvento(eventoId, formData)` e `AtualizarEventoResult` batem entre stub (Task 3), consumo (Task 3 form) e implementação (Task 5). `montarPayloadUpdate` mesmo nome no teste e na impl (Task 5). `EventoForm({ modo, evento })` consistente entre Task 3 e Task 4. ✓
