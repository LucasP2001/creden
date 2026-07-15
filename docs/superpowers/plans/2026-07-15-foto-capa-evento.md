# Foto de capa do evento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o organizador anexe uma foto de capa ao evento — armazenada no Supabase Storage — que substitui o gradiente na página pública, no card do dashboard e no ingresso; foto opcional, editável depois via dashboard.

**Architecture:** Bucket público `eventos-capas` no Supabase Storage (path `{user_id}/{evento_id}.{ext}`). Coluna `imagem_url text` em `eventos`. Componente client `ImageUpload` reusado no criar-evento e no modal de edição. Render com fallback gradiente em todas as telas.

**Tech Stack:** Next.js 14 (App Router), Supabase (`@supabase/ssr`, `@supabase/supabase-js`), Tailwind. `next/image` para a foto.

## Global Constraints

- UI e microcopy em **pt-BR**.
- **Sem test runner** no projeto — verificação é build (`npm run build`) + smoke manual no browser. Não inventar testes unitários.
- Foto **opcional**: ausência = fallback gradiente. Nada pode quebrar em eventos sem `imagem_url`.
- Formatos aceitos: `image/jpeg`, `image/png`, `image/webp`. Máx **5 MB**.
- Bucket **público** `eventos-capas`. Path do objeto: `{user_id}/{evento_id}.{ext}`.
- Não expor `service_role` no browser. Upload sempre via Server Action.
- Server Components por padrão; `'use client'` só onde há interatividade (upload/preview/modal).
- Ao decidir valores concretos (bucket, coluna), **atualizar a skill `creden-supabase`** para não driftar.

---

## File Structure

- `supabase/migrations/002_evento_imagem.sql` — **criar**. Coluna + bucket + policies.
- `supabase/schema.sql` — **modificar**. Refletir coluna `imagem_url` no bloco `eventos` (schema é fonte declarativa).
- `types/index.ts:17-31` — **modificar**. Campo `imagem_url` em `Evento`.
- `next.config.mjs` — **modificar**. `images.remotePatterns` para o host Supabase.
- `lib/imagem.ts` — **criar**. Validação compartilhada (tipos/tamanho) usada no client e na server action. Uma fonte de verdade.
- `components/ImageUpload.tsx` — **criar**. Dropzone client + preview + validação.
- `app/eventos/novo/NovoEventoForm.tsx` — **modificar**. Inserir `ImageUpload`.
- `app/eventos/novo/actions.ts` — **modificar**. Insert → upload → update.
- `app/e/[slug]/page.tsx:56-70` — **modificar**. Hero com foto/fallback.
- `components/EventCard.tsx:22-23` — **modificar**. Thumbnail de capa/fallback + botão trocar.
- `app/i/[token]/page.tsx` — **modificar**. Faixa de foto/fallback.
- `app/dashboard/TrocarCapaModal.tsx` — **criar**. Modal client de troca (fase 3).
- `app/dashboard/actions.ts` — **criar**. Server action `trocarCapa`.

---

## Task 1: Storage + schema (Fase 1)

**Files:**
- Create: `supabase/migrations/002_evento_imagem.sql`
- Modify: `supabase/schema.sql` (bloco `eventos`, ~linha 36)
- Modify: `types/index.ts` (interface `Evento`, ~linha 26)

**Interfaces:**
- Produces: coluna `eventos.imagem_url text null`; bucket público `eventos-capas`; campo `Evento.imagem_url: string | null`.

- [ ] **Step 1: Escrever a migration**

Create `supabase/migrations/002_evento_imagem.sql`:

```sql
-- 002_evento_imagem.sql — foto de capa do evento.
-- Coluna imagem_url + bucket público eventos-capas + policies por dono.

-- Coluna (URL pública completa; null = usa gradiente)
alter table public.eventos
  add column if not exists imagem_url text;

-- Bucket público de capas
insert into storage.buckets (id, name, public)
values ('eventos-capas', 'eventos-capas', true)
on conflict (id) do nothing;

-- Leitura pública (página pública é anônima)
drop policy if exists "capas leitura publica" on storage.objects;
create policy "capas leitura publica"
  on storage.objects for select
  using ( bucket_id = 'eventos-capas' );

-- Escrita/atualização/remoção apenas pelo dono.
-- Path é {user_id}/{evento_id}.ext — a 1ª pasta é o user_id.
drop policy if exists "capas insere dono" on storage.objects;
create policy "capas insere dono"
  on storage.objects for insert
  with check (
    bucket_id = 'eventos-capas'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "capas atualiza dono" on storage.objects;
create policy "capas atualiza dono"
  on storage.objects for update
  using (
    bucket_id = 'eventos-capas'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "capas remove dono" on storage.objects;
create policy "capas remove dono"
  on storage.objects for delete
  using (
    bucket_id = 'eventos-capas'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
```

- [ ] **Step 2: Refletir a coluna no schema declarativo**

Modify `supabase/schema.sql`, no bloco `create table ... eventos`, adicionar após a linha `slug text not null unique,`:

```sql
  imagem_url    text,                              -- capa (Storage); null = gradiente
```

- [ ] **Step 3: Adicionar o campo ao tipo**

Modify `types/index.ts`, na interface `Evento`, após `slug: string`:

```ts
  imagem_url: string | null // URL pública da capa no Storage; null = gradiente
```

- [ ] **Step 4: Aplicar a migration no Supabase**

Rodar o SQL de `002_evento_imagem.sql` no SQL Editor do projeto Supabase (ou via CLI se configurada).

Verificar no painel:
- tabela `eventos` tem coluna `imagem_url`;
- Storage tem bucket `eventos-capas` marcado **público**;
- em Storage → Policies aparecem as 4 policies.

- [ ] **Step 5: Verificar build**

Run: `npm run build`
Expected: build passa (tipo `Evento` novo compila; nada usa `imagem_url` ainda).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/002_evento_imagem.sql supabase/schema.sql types/index.ts
git commit -m "feat: coluna imagem_url + bucket eventos-capas (fase 1)"
```

---

## Task 2: Validação compartilhada + next.config

**Files:**
- Create: `lib/imagem.ts`
- Modify: `next.config.mjs`

**Interfaces:**
- Produces: `IMAGEM_TIPOS_ACEITOS: string[]`, `IMAGEM_TAMANHO_MAX: number`, `validarImagem(file: { type: string; size: number }): string | null` (retorna mensagem de erro pt-BR, ou `null` se ok), `extensaoImagem(type: string): string`.

- [ ] **Step 1: Escrever o módulo de validação**

Create `lib/imagem.ts`:

```ts
// Validação de imagem de capa — compartilhada entre o client (ImageUpload)
// e as server actions. Uma fonte de verdade para tipos/tamanho.

export const IMAGEM_TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp']
export const IMAGEM_TAMANHO_MAX = 5 * 1024 * 1024 // 5 MB

/** Retorna mensagem de erro (pt-BR) ou null se a imagem é válida. */
export function validarImagem(file: { type: string; size: number }): string | null {
  if (!IMAGEM_TIPOS_ACEITOS.includes(file.type)) {
    return 'Use uma imagem JPG, PNG ou WEBP.'
  }
  if (file.size > IMAGEM_TAMANHO_MAX) {
    return 'A imagem deve ter no máximo 5 MB.'
  }
  return null
}

/** Extensão de arquivo a partir do mime type. Assume tipo já validado. */
export function extensaoImagem(type: string): string {
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  return 'jpg'
}
```

- [ ] **Step 2: Configurar next/image para o host Supabase**

Modify `next.config.mjs`. Extrair o hostname de `NEXT_PUBLIC_SUPABASE_URL` (formato `https://<ref>.supabase.co`):

```js
/** @type {import('next').NextConfig} */
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: 'https',
            hostname: supabaseHost,
            pathname: '/storage/v1/object/public/**',
          },
        ]
      : [],
  },
}

export default nextConfig
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: build passa. `next.config.mjs` lê a env em build time (existe em `.env.local`).

- [ ] **Step 4: Commit**

```bash
git add lib/imagem.ts next.config.mjs
git commit -m "feat: validacao de imagem compartilhada + remotePatterns supabase"
```

---

## Task 3: Componente ImageUpload

**Files:**
- Create: `components/ImageUpload.tsx`

**Interfaces:**
- Consumes: `validarImagem`, `IMAGEM_TIPOS_ACEITOS` de `@/lib/imagem`.
- Produces: componente `ImageUpload` com props `{ name: string; label?: string; defaultPreview?: string | null }`. Renderiza um `<input type="file" name={name}>` (o `File` viaja via FormData da server action). Mostra preview e erro de validação inline.

- [ ] **Step 1: Escrever o componente**

Create `components/ImageUpload.tsx`:

```tsx
'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { validarImagem, IMAGEM_TIPOS_ACEITOS } from '@/lib/imagem'

interface Props {
  name: string
  label?: string
  defaultPreview?: string | null
}

// Dropzone de imagem: input file + preview + validação client.
// O File selecionado viaja pela server action via FormData (name={name}).
export function ImageUpload({ name, label = 'Foto de capa', defaultPreview = null }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(defaultPreview)
  const [erro, setErro] = useState<string | null>(null)

  function aoSelecionar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setErro(null)
    if (!file) {
      setPreview(defaultPreview)
      return
    }
    const msg = validarImagem(file)
    if (msg) {
      setErro(msg)
      e.target.value = ''
      setPreview(defaultPreview)
      return
    }
    setPreview(URL.createObjectURL(file))
  }

  return (
    <div>
      <label className="block text-[13px] font-semibold mb-1.5">{label}</label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-md border border-dashed border-line bg-surface overflow-hidden text-left hover:border-primary-light transition"
      >
        {preview ? (
          <div className="relative h-40 w-full">
            <Image src={preview} alt="Prévia da capa" fill className="object-cover" unoptimized />
          </div>
        ) : (
          <div className="h-40 grid place-items-center text-muted text-sm gap-1">
            <span className="text-2xl">🖼️</span>
            <span>Clique para escolher uma foto</span>
            <span className="text-xs">JPG, PNG ou WEBP · até 5 MB</span>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={IMAGEM_TIPOS_ACEITOS.join(',')}
        onChange={aoSelecionar}
        className="hidden"
      />
      {preview && (
        <button
          type="button"
          onClick={() => {
            if (inputRef.current) inputRef.current.value = ''
            setPreview(defaultPreview)
            setErro(null)
          }}
          className="text-xs text-muted hover:text-error mt-1.5"
        >
          Remover foto
        </button>
      )}
      {erro && <p className="text-error text-xs mt-1.5">{erro}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: build passa. Componente ainda não é usado — só compila.

- [ ] **Step 3: Commit**

```bash
git add components/ImageUpload.tsx
git commit -m "feat: componente ImageUpload (dropzone + preview + validacao)"
```

---

## Task 4: Upload no criar evento (Fase 2)

**Files:**
- Modify: `app/eventos/novo/NovoEventoForm.tsx` (card "Informações", ~linha 45)
- Modify: `app/eventos/novo/actions.ts` (função `criarEvento`)

**Interfaces:**
- Consumes: `ImageUpload` de `@/components/ImageUpload`; `validarImagem`, `extensaoImagem` de `@/lib/imagem`.
- Produces: eventos criados podem ter `imagem_url` preenchido.

- [ ] **Step 1: Inserir ImageUpload no form**

Modify `app/eventos/novo/NovoEventoForm.tsx`. Adicionar o import no topo:

```tsx
import { ImageUpload } from '@/components/ImageUpload'
```

Dentro do card "Informações do evento", logo após o `<div className="mb-[18px]">` do campo Nome (antes do bloco Descrição), inserir:

```tsx
          <div className="mb-[18px]">
            <ImageUpload name="capa" />
          </div>
```

- [ ] **Step 2: Insert → upload → update na action**

Modify `app/eventos/novo/actions.ts`. Adicionar imports:

```ts
import { validarImagem, extensaoImagem } from '@/lib/imagem'
```

Substituir o bloco do `insert` (atualmente `const { error } = await supabase.from('eventos').insert({ ... })` e o `if (error)` seguinte) por:

```ts
  const { data: novo, error } = await supabase
    .from('eventos')
    .insert({
      user_id: user.id,
      nome,
      descricao: String(formData.get('descricao') ?? '') || null,
      data_hora: new Date(dataHora).toISOString(),
      local: String(formData.get('local') ?? '') || null,
      vagas_max: vagasRaw ? Number(vagasRaw) : null,
      valor: valorRaw ? Math.round(Number(valorRaw) * 100) : 0, // reais -> centavos
      slug,
      campos_extras: camposExtras,
    })
    .select('id')
    .single()

  if (error || !novo) {
    return { ok: false, erro: 'Não foi possível publicar o evento. Tente novamente.' }
  }

  // Upload da capa (opcional). Falha aqui não bloqueia a publicação.
  const capa = formData.get('capa')
  if (capa instanceof File && capa.size > 0 && !validarImagem(capa)) {
    const ext = extensaoImagem(capa.type)
    const path = `${user.id}/${novo.id}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('eventos-capas')
      .upload(path, capa, { upsert: true, contentType: capa.type })
    if (!upErr) {
      const { data: pub } = supabase.storage.from('eventos-capas').getPublicUrl(path)
      await supabase.from('eventos').update({ imagem_url: pub.publicUrl }).eq('id', novo.id)
    }
  }
```

O `redirect('/dashboard')` no final permanece.

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: build passa.

- [ ] **Step 4: Smoke manual**

`npm run dev`, logar, criar evento **com** foto (JPG < 5MB): confere preview no form, publica sem erro. No painel Supabase, o objeto aparece em `eventos-capas/{user_id}/{evento_id}.jpg` e a linha tem `imagem_url` preenchido. Criar outro evento **sem** foto: publica normal, `imagem_url` fica null.

- [ ] **Step 5: Commit**

```bash
git add app/eventos/novo/NovoEventoForm.tsx app/eventos/novo/actions.ts
git commit -m "feat: upload de capa ao criar evento"
```

---

## Task 5: Render da capa nas 3 telas

**Files:**
- Modify: `app/e/[slug]/page.tsx` (hero, ~linha 56-70)
- Modify: `components/EventCard.tsx` (faixa de capa, linha 23)
- Modify: `app/i/[token]/page.tsx` (após o header do ingresso)

**Interfaces:**
- Consumes: `Evento.imagem_url` (Task 1). Usa `next/image`.

- [ ] **Step 1: Página pública — foto no hero com fallback**

Modify `app/e/[slug]/page.tsx`. Adicionar import no topo:

```tsx
import Image from 'next/image'
```

Substituir o bloco do hero (a `<div>` de `h-[260px]` com o gradiente) por:

```tsx
      {/* Hero */}
      <div className="relative h-[260px] overflow-hidden">
        {ev.imagem_url ? (
          <Image src={ev.imagem_url} alt={`Capa de ${ev.nome}`} fill priority className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary via-primary to-primary-light" />
        )}
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-[760px] mx-auto w-full px-6 pb-8">
            {vagasRestantes != null && (
              <span
                className={`badge font-bold ${lotado ? 'bg-error text-white' : 'bg-white/95 text-primary'}`}
              >
                {lotado ? 'Esgotado' : `${vagasRestantes} ${vagasRestantes === 1 ? 'vaga restante' : 'vagas restantes'}`}
              </span>
            )}
          </div>
        </div>
      </div>
```

- [ ] **Step 2: EventCard — thumbnail com fallback**

Modify `components/EventCard.tsx`. Adicionar import no topo:

```tsx
import Image from 'next/image'
```

Substituir a linha da faixa de capa (`<div className="h-[90px] bg-gradient-to-br from-primary to-primary-light" />`) por:

```tsx
      <div className="relative h-[90px] overflow-hidden">
        {evento.imagem_url ? (
          <Image src={evento.imagem_url} alt={`Capa de ${evento.nome}`} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-light" />
        )}
      </div>
```

- [ ] **Step 3: Ingresso — faixa de foto com fallback**

Modify `app/i/[token]/page.tsx`. Adicionar import no topo:

```tsx
import Image from 'next/image'
```

Logo após o `</div>` que fecha o header do ingresso (o bloco `bg-primary text-white px-6 py-5 ...`) e antes da faixa de status (`● Válido`), inserir:

```tsx
          {ev.imagem_url && (
            <div className="relative h-28 w-full">
              <Image src={ev.imagem_url} alt={`Capa de ${ev.nome}`} fill className="object-cover" />
            </div>
          )}
```

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: build passa.

- [ ] **Step 5: Smoke manual**

`npm run dev`. Para o evento **com** foto: abrir `/e/{slug}` (foto no topo), `/dashboard` (thumbnail no card), e o ingresso `/i/{token}` (faixa da foto). Para o evento **sem** foto: os 3 mostram o gradiente. Verificar que não há erro de `next/image` (host liberado no config).

- [ ] **Step 6: Commit**

```bash
git add app/e/[slug]/page.tsx components/EventCard.tsx app/i/[token]/page.tsx
git commit -m "feat: renderiza capa do evento nas telas publica/dashboard/ingresso"
```

---

## Task 6: Trocar foto pelo dashboard (Fase 3)

**Files:**
- Create: `app/dashboard/actions.ts`
- Create: `app/dashboard/TrocarCapaModal.tsx`
- Modify: `components/EventCard.tsx` (botão "Trocar foto")

**Interfaces:**
- Consumes: `ImageUpload`, `validarImagem`, `extensaoImagem`, `createServerSupabase`.
- Produces: server action `trocarCapa(formData: FormData)` (lê `evento_id` e `capa` do form) → `{ ok: boolean; erro?: string }`; componente `TrocarCapaModal` com props `{ eventoId: string }`.

- [ ] **Step 1: Server action trocarCapa**

Create `app/dashboard/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase'
import { validarImagem, extensaoImagem } from '@/lib/imagem'

export interface TrocarCapaResult {
  ok: boolean
  erro?: string
}

// Troca a capa de um evento existente. RLS (dono) garante a autorização;
// o path {user_id}/{evento_id}.ext é sobrescrito (upsert) e a URL recebe
// cache-bust para forçar refresh do CDN/navegador.
export async function trocarCapa(formData: FormData): Promise<TrocarCapaResult> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, erro: 'Sessão expirada. Entre novamente.' }

  const eventoId = String(formData.get('evento_id') ?? '')
  if (!eventoId) return { ok: false, erro: 'Evento inválido.' }

  const capa = formData.get('capa')
  if (!(capa instanceof File) || capa.size === 0) {
    return { ok: false, erro: 'Escolha uma imagem.' }
  }
  const invalido = validarImagem(capa)
  if (invalido) return { ok: false, erro: invalido }

  const ext = extensaoImagem(capa.type)
  const path = `${user.id}/${eventoId}.${ext}`
  const { error: upErr } = await supabase.storage
    .from('eventos-capas')
    .upload(path, capa, { upsert: true, contentType: capa.type })
  if (upErr) return { ok: false, erro: 'Não foi possível enviar a imagem.' }

  const { data: pub } = supabase.storage.from('eventos-capas').getPublicUrl(path)
  const urlComBust = `${pub.publicUrl}?v=${Date.now()}`
  const { error: dbErr } = await supabase
    .from('eventos')
    .update({ imagem_url: urlComBust })
    .eq('id', eventoId)
  if (dbErr) return { ok: false, erro: 'Não foi possível salvar a imagem.' }

  revalidatePath('/dashboard')
  return { ok: true }
}
```

- [ ] **Step 2: Modal de troca**

Create `app/dashboard/TrocarCapaModal.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { ImageUpload } from '@/components/ImageUpload'
import { Button } from '@/components/ui/Button'
import { trocarCapa } from './actions'

// Modal de troca de capa no dashboard. Reusa ImageUpload; envia via server action.
export function TrocarCapaModal({ eventoId }: { eventoId: string }) {
  const [aberto, setAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function enviar(formData: FormData) {
    setEnviando(true)
    setErro(null)
    formData.set('evento_id', eventoId)
    const res = await trocarCapa(formData)
    setEnviando(false)
    if (res.ok) setAberto(false)
    else setErro(res.erro ?? 'Não foi possível trocar a foto.')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-xs font-semibold text-white bg-black/40 backdrop-blur px-2.5 py-1 rounded-pill hover:bg-black/55"
      >
        Trocar foto
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4"
          onClick={() => !enviando && setAberto(false)}
        >
          <div className="card p-6 w-[min(420px,94vw)]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Trocar foto de capa</h3>
            <form action={enviar} className="grid gap-4">
              <ImageUpload name="capa" label="Nova foto" />
              {erro && <p className="text-error text-sm">{erro}</p>}
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="ghost" onClick={() => setAberto(false)} disabled={enviando}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={enviando}>
                  {enviando ? 'Enviando…' : 'Salvar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 3: Botão no EventCard**

Modify `components/EventCard.tsx`. Adicionar import no topo:

```tsx
import { TrocarCapaModal } from '@/app/dashboard/TrocarCapaModal'
```

Sobrepor o botão no canto da faixa de capa. Substituir o bloco da faixa (criado na Task 5, Step 2) por:

```tsx
      <div className="relative h-[90px] overflow-hidden">
        {evento.imagem_url ? (
          <Image src={evento.imagem_url} alt={`Capa de ${evento.nome}`} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-light" />
        )}
        <div className="absolute top-2 right-2">
          <TrocarCapaModal eventoId={evento.id} />
        </div>
      </div>
```

- [ ] **Step 4: Verificar build**

Run: `npm run build`
Expected: build passa.

- [ ] **Step 5: Smoke manual**

`npm run dev`, dashboard. Num card **sem** foto, clicar "Trocar foto", escolher imagem, salvar: modal fecha, thumbnail aparece. Recarregar `/e/{slug}` e `/i/{token}` daquele evento — foto atualizada (cache-bust). Trocar de novo por outra imagem: atualiza (não fica presa a versão antiga).

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/actions.ts app/dashboard/TrocarCapaModal.tsx components/EventCard.tsx
git commit -m "feat: trocar foto de capa pelo dashboard"
```

---

## Task 7: Atualizar skill creden-supabase

**Files:**
- Modify: `.claude/skills/creden-supabase/SKILL.md`

- [ ] **Step 1: Documentar coluna, bucket e policies**

Modify a skill `creden-supabase`: adicionar `imagem_url text` ao modelo de `eventos`, e uma seção curta sobre o bucket público `eventos-capas` (path `{user_id}/{evento_id}.ext`, policies: leitura pública, escrita/update/delete por dono). Manter como fonte de verdade — CLAUDE.md pede que valores concretos atualizem a skill.

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/creden-supabase/SKILL.md
git commit -m "docs: skill creden-supabase reflete capa do evento"
```

---

## Self-Review

- **Cobertura do spec:** Storage/bucket/coluna (Task 1) ✓; validação + next/image (Task 2) ✓; ImageUpload compartilhado (Task 3) ✓; upload no criar + render 3 telas (Tasks 4-5) ✓; editar via dashboard (Task 6) ✓; atualizar skill (Task 7, exigido pelo CLAUDE.md) ✓. Nota do spec sobre `next/image`/`remotePatterns` coberta na Task 2.
- **Placeholders:** nenhum — todo passo traz código real e comandos concretos.
- **Consistência de tipos:** `imagem_url: string | null` idêntico em Task 1 (tipo) e usos (Tasks 4-6); `validarImagem`/`extensaoImagem`/`IMAGEM_TIPOS_ACEITOS` definidos na Task 2 e consumidos com as mesmas assinaturas nas Tasks 3,4,6; `trocarCapa(formData)` lê `evento_id`/`capa` conforme o modal seta na Task 6.
- **Sem test runner:** verificação por `npm run build` + smoke manual, coerente com o projeto (Global Constraints).
