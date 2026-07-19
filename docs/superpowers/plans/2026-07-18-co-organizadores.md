# Co-organizadores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o dono de um evento convide colaboradores (papéis `editor` e `checkin`) por e-mail, com aceite via link, e revogue o acesso.

**Architecture:** Nova tabela `colaboradores` (evento + e-mail + user_id + papel + status + token). Acesso encapsulado em funções SQL (`pode_ver_evento`, `pode_editar_evento`) usadas nas policies de `eventos`/`inscricoes`; as rotas de gestão validam o papel no servidor com um helper `acessoEvento`. Convite e aceite via server actions; e-mail pela Brevo já existente.

**Tech Stack:** Next.js 14 (App Router), Supabase (Postgres + RLS), Brevo (REST/fetch), Vitest.

## Global Constraints

- Migrations SQL **não são aplicadas por código** — o MCP do Supabase é read-only neste projeto. Cada migration é um arquivo em `supabase/migrations/` que o **usuário roda no SQL Editor** do painel. O plano marca esses pontos com "⚠️ AÇÃO DO USUÁRIO".
- `service_role` nunca vai ao browser (só server). Env em `.env.local`.
- UI e microcopy em **pt-BR**. Paleta/tom pela skill `creden-design`.
- E-mail sem SDK: Brevo via `fetch` (padrão de `lib/email.ts`).
- Papéis: exatamente `'editor'` e `'checkin'`. Status: `'pendente'` e `'ativo'`.
- Componentes base reusados de `components/ui/` (Button, Input, Select). Não recriar.
- Tokens gerados com `gerarToken()` de `lib/qr.ts` (UUID sem hífens, `tokenValido` = `/^[a-f0-9]{32}$/`).

---

## Task 1: Migration `colaboradores` + funções + policies

**Files:**
- Create: `supabase/migrations/009_colaboradores.sql`
- Modify: `supabase/schema.sql` (espelhar a migration, seção nova ao final)

**Interfaces:**
- Produces: tabela `public.colaboradores`; funções `public.pode_ver_evento(uuid) returns boolean`, `public.pode_editar_evento(uuid) returns boolean`.

- [ ] **Step 1: Escrever a migration**

Create `supabase/migrations/009_colaboradores.sql`:

```sql
-- 009_colaboradores.sql — co-organizadores por evento.
-- Papéis: 'editor' (mexe em tudo, menos apagar/transferir) e 'checkin' (só a
-- portaria + ver a lista). Convite por e-mail; aceite explícito via /convite/[token].
-- Rode uma vez no SQL Editor do Supabase (idempotente).

create table if not exists public.colaboradores (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid not null references public.eventos(id) on delete cascade,
  email       text not null,
  user_id     uuid references auth.users(id) on delete cascade,
  papel       text not null check (papel in ('editor','checkin')),
  status      text not null default 'pendente' check (status in ('pendente','ativo')),
  token       text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists colaboradores_evento_email_uidx
  on public.colaboradores (evento_id, lower(email));
create index if not exists colaboradores_evento_idx on public.colaboradores (evento_id);
create index if not exists colaboradores_user_idx   on public.colaboradores (user_id);
create index if not exists colaboradores_token_idx  on public.colaboradores (token);

drop trigger if exists colaboradores_set_updated_at on public.colaboradores;
create trigger colaboradores_set_updated_at
  before update on public.colaboradores
  for each row execute function public.set_updated_at();

-- Funções de acesso. SECURITY DEFINER para poder ler colaboradores/eventos sem
-- recursão de RLS; STABLE porque só leem.
create or replace function public.pode_ver_evento(ev uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from eventos e where e.id = ev and e.user_id = auth.uid())
      or exists (select 1 from colaboradores c
                 where c.evento_id = ev and c.user_id = auth.uid() and c.status = 'ativo');
$$;

create or replace function public.pode_editar_evento(ev uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from eventos e where e.id = ev and e.user_id = auth.uid())
      or exists (select 1 from colaboradores c
                 where c.evento_id = ev and c.user_id = auth.uid()
                   and c.status = 'ativo' and c.papel = 'editor');
$$;

alter table public.colaboradores enable row level security;

-- eventos: colaborador ativo passa a enxergar/editar (dono continua podendo tudo).
drop policy if exists "eventos: dono lê" on public.eventos;
create policy "eventos: pode ver" on public.eventos
  for select using (public.pode_ver_evento(id));

drop policy if exists "eventos: dono atualiza" on public.eventos;
create policy "eventos: pode editar" on public.eventos
  for update using (public.pode_editar_evento(id)) with check (public.pode_editar_evento(id));
-- (inserir/apagar continuam só do dono — policies inalteradas.)

-- inscricoes: leitura/atualização por qualquer um que pode ver o evento.
drop policy if exists "inscricoes: dono do evento lê" on public.inscricoes;
create policy "inscricoes: organizador lê" on public.inscricoes
  for select using (public.pode_ver_evento(evento_id));

drop policy if exists "inscricoes: dono do evento atualiza" on public.inscricoes;
create policy "inscricoes: organizador atualiza" on public.inscricoes
  for update using (public.pode_ver_evento(evento_id))
  with check (public.pode_ver_evento(evento_id));

-- colaboradores: dono do evento gerencia; convidado vê a própria linha.
create policy "colaboradores: dono gerencia" on public.colaboradores
  for all
  using (exists (select 1 from eventos e where e.id = colaboradores.evento_id and e.user_id = auth.uid()))
  with check (exists (select 1 from eventos e where e.id = colaboradores.evento_id and e.user_id = auth.uid()));

create policy "colaboradores: convidado vê a própria" on public.colaboradores
  for select using (auth.uid() = user_id);
```

- [ ] **Step 2: Espelhar no schema.sql**

Anexar o mesmo conteúdo (sem o cabeçalho "rode uma vez") ao final de `supabase/schema.sql`, para o schema versionado ficar completo.

- [ ] **Step 3: ⚠️ AÇÃO DO USUÁRIO — aplicar a migration**

Pedir ao usuário para colar `009_colaboradores.sql` no SQL Editor do Supabase e rodar. Confirmar com uma leitura:

Run (após aplicada):
```bash
KEY=$(grep -i "ANON_KEY" .env.local | cut -d= -f2)
curl -s "$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d= -f2)/rest/v1/colaboradores?select=id&limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -w "\nHTTP %{http_code}\n"
```
Expected: `HTTP 200` com `[]` (tabela existe, vazia; RLS bloqueia anon → lista vazia é ok).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/009_colaboradores.sql supabase/schema.sql
git commit -m "feat(db): tabela colaboradores + funcoes de acesso e policies"
```

---

## Task 2: Tipos e helper de acesso ao evento (server)

**Files:**
- Modify: `types/index.ts` (adicionar `Colaborador`, `PapelColaborador`)
- Create: `lib/acesso.ts`
- Test: `lib/acesso.test.ts`

**Interfaces:**
- Produces: `type PapelColaborador = 'editor' | 'checkin'`; `interface Colaborador`; `type AcessoEvento = { ehDono: boolean; papel: PapelColaborador | null; podeVer: boolean; podeEditar: boolean }`; `function resolverAcesso(ehDono: boolean, papel: PapelColaborador | null): AcessoEvento`.
- Consumes: nada.

- [ ] **Step 1: Adicionar tipos**

Em `types/index.ts`, após a interface `Inscricao`:

```typescript
export type PapelColaborador = 'editor' | 'checkin'

export interface Colaborador {
  id: string
  evento_id: string
  email: string
  user_id: string | null
  papel: PapelColaborador
  status: 'pendente' | 'ativo'
  token: string
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Escrever o teste da regra de acesso**

Create `lib/acesso.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { resolverAcesso } from './acesso'

describe('resolverAcesso', () => {
  it('dono pode ver e editar', () => {
    expect(resolverAcesso(true, null)).toEqual({
      ehDono: true, papel: null, podeVer: true, podeEditar: true,
    })
  })
  it('editor (não dono) pode ver e editar', () => {
    const a = resolverAcesso(false, 'editor')
    expect(a.podeVer).toBe(true)
    expect(a.podeEditar).toBe(true)
    expect(a.ehDono).toBe(false)
  })
  it('checkin pode ver, não pode editar', () => {
    const a = resolverAcesso(false, 'checkin')
    expect(a.podeVer).toBe(true)
    expect(a.podeEditar).toBe(false)
  })
  it('sem papel e não dono: nada', () => {
    const a = resolverAcesso(false, null)
    expect(a.podeVer).toBe(false)
    expect(a.podeEditar).toBe(false)
  })
})
```

- [ ] **Step 3: Rodar o teste (falha)**

Run: `npx vitest run lib/acesso.test.ts`
Expected: FAIL — `resolverAcesso` não existe.

- [ ] **Step 4: Implementar `lib/acesso.ts`**

```typescript
// Acesso de um usuário a um evento: dono ou colaborador (editor/checkin).
// resolverAcesso é pura (testável). acessoEvento faz o I/O no servidor.
import { createServerSupabase, createAdminSupabase } from './supabase'
import { PapelColaborador } from '@/types'

export interface AcessoEvento {
  ehDono: boolean
  papel: PapelColaborador | null
  podeVer: boolean
  podeEditar: boolean
}

/** Deriva as permissões a partir de "é dono?" e do papel do colaborador. */
export function resolverAcesso(ehDono: boolean, papel: PapelColaborador | null): AcessoEvento {
  const podeVer = ehDono || papel !== null
  const podeEditar = ehDono || papel === 'editor'
  return { ehDono, papel, podeVer, podeEditar }
}

/**
 * Contexto de acesso do usuário logado a um evento. Lê dono (RLS) e o papel do
 * colaborador (admin, filtrando por evento+user). Retorna acesso "vazio" se não
 * houver usuário.
 */
export async function acessoEvento(eventoId: string): Promise<AcessoEvento & { userId: string | null }> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ...resolverAcesso(false, null), userId: null }

  const admin = createAdminSupabase()
  const { data: ev } = await admin
    .from('eventos')
    .select('user_id')
    .eq('id', eventoId)
    .maybeSingle()
  const ehDono = !!ev && (ev as { user_id: string }).user_id === user.id

  let papel: PapelColaborador | null = null
  if (!ehDono) {
    const { data: col } = await admin
      .from('colaboradores')
      .select('papel, status')
      .eq('evento_id', eventoId)
      .eq('user_id', user.id)
      .eq('status', 'ativo')
      .maybeSingle()
    papel = col ? (col as { papel: PapelColaborador }).papel : null
  }

  return { ...resolverAcesso(ehDono, papel), userId: user.id }
}
```

- [ ] **Step 5: Rodar o teste (passa)**

Run: `npx vitest run lib/acesso.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 6: Commit**

```bash
git add types/index.ts lib/acesso.ts lib/acesso.test.ts
git commit -m "feat: tipos Colaborador e helper de acesso ao evento"
```

---

## Task 3: Guardas de rota usam o acesso

**Files:**
- Modify: `app/eventos/[id]/(gerir)/layout.tsx`
- Modify: `app/eventos/[id]/(gerir)/page.tsx` (resumo)
- Modify: `app/eventos/[id]/editar/page.tsx`
- Modify: `app/eventos/[id]/checkin/page.tsx`
- Modify: `app/eventos/[id]/(gerir)/inscritos/page.tsx`

**Interfaces:**
- Consumes: `acessoEvento` de `lib/acesso.ts`.

- [ ] **Step 1: Layout exige "pode ver"**

Em `app/eventos/[id]/(gerir)/layout.tsx`, trocar a guarda. Antes lê só `id, nome` sem checar dono. Adicionar:

```typescript
import { acessoEvento } from '@/lib/acesso'
// ...
export default async function GerirLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  const acesso = await acessoEvento(params.id)
  if (!acesso.podeVer) notFound()

  const supabase = await createServerSupabase()
  const { data: evento } = await supabase
    .from('eventos').select('id, nome').eq('id', params.id).single()
  if (!evento) notFound()
  const ev = evento as Pick<Evento, 'id' | 'nome'>
  // ...resto igual, passando acesso para AbasEvento se precisar esconder abas
```

Passar `podeEditar` para `AbasEvento` (Task 6 usa para esconder abas de quem é `checkin`). Por ora, `<AbasEvento id={ev.id} podeEditar={acesso.podeEditar} />`.

- [ ] **Step 2: Resumo — trocar guarda dono→acesso**

Em `app/eventos/[id]/(gerir)/page.tsx`, substituir o bloco que faz `if (!evento || evento.user_id !== user.id) notFound()` por uso de `acessoEvento`:

```typescript
import { acessoEvento } from '@/lib/acesso'
// no início do componente:
const acesso = await acessoEvento(params.id)
if (!acesso.podeVer) notFound()
// carregar o evento com admin (já validado):
const { data: evento } = await createAdminSupabase()
  .from('eventos').select('*').eq('id', params.id).single()
if (!evento) notFound()
const ev = evento as Evento
```

Envolver o botão "Editar evento" em `acesso.podeEditar`:

```tsx
{acesso.podeEditar && (
  <ButtonLink href={`/eventos/${ev.id}/editar`} block>Editar evento</ButtonLink>
)}
```

- [ ] **Step 3: Editar — exige podeEditar**

Em `app/eventos/[id]/editar/page.tsx`, trocar `evento.user_id !== user.id` por:

```typescript
import { acessoEvento } from '@/lib/acesso'
const acesso = await acessoEvento(params.id)
if (!acesso.podeEditar) notFound()
const { data: evento } = await createAdminSupabase()
  .from('eventos').select('*').eq('id', params.id).single()
if (!evento) notFound()
const ev = evento as Evento
```

- [ ] **Step 4: Check-in e inscritos — exigem podeVer**

Em `app/eventos/[id]/checkin/page.tsx` e `app/eventos/[id]/(gerir)/inscritos/page.tsx`, no ponto onde hoje se valida o dono, trocar por:

```typescript
import { acessoEvento } from '@/lib/acesso'
const acesso = await acessoEvento(params.id)
if (!acesso.podeVer) notFound()
```

(Ambos os papéis veem inscritos e check-in; só a edição do evento é restrita.)

- [ ] **Step 5: Build + smoke**

Run: `npx tsc --noEmit && npx next build 2>&1 | grep -E "Compiled|Failed|error"`
Expected: `✓ Compiled successfully`, sem erros.

- [ ] **Step 6: Commit**

```bash
git add "app/eventos/[id]"
git commit -m "feat: guardas de rota do evento usam acesso (dono ou colaborador)"
```

---

## Task 4: Server actions de convite, aceite e revogação

**Files:**
- Create: `app/eventos/[id]/(gerir)/equipe/actions.ts`
- Create: `app/convite/[token]/actions.ts`
- Modify: `lib/email.ts` (adicionar `enviarConvite`)
- Test: `lib/email.test.ts` (montagem do link do convite — se o arquivo não existir, criar)

**Interfaces:**
- Consumes: `acessoEvento` (Task 2), `gerarToken`/`tokenValido` (`lib/qr.ts`), Brevo (`lib/email.ts`).
- Produces: `convidarColaborador(eventoId, formData) → {ok, erro?}`; `revogarColaborador(eventoId, colaboradorId) → {ok, erro?}`; `aceitarConvite(token) → {ok, erro?, eventoId?}`; `enviarConvite({para, nomeEvento, papel, token})`.

- [ ] **Step 1: `enviarConvite` na lib/email.ts**

Adicionar em `lib/email.ts` (reusa `BREVO_ENDPOINT`, `FROM_*`, `escapar` já existentes):

```typescript
interface EnviarConviteParams {
  para: string
  nomeEvento: string
  papel: 'editor' | 'checkin'
  token: string
}

/** Convite para co-organizar um evento. Link leva a /convite/[token]. */
export async function enviarConvite(p: EnviarConviteParams) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) throw new Error('BREVO_API_KEY não configurada.')

  const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const link = `${base}/convite/${p.token}`
  const papelRotulo = p.papel === 'editor' ? 'editor (gerencia o evento)' : 'check-in (portaria)'

  const htmlContent = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"></head>
<body style="margin:0;background:#F4F1EA;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:100%;background:#FBF8F1;border-radius:16px;padding:28px">
        <tr><td style="font-family:Georgia,serif;font-size:20px;color:#16302E;font-weight:bold">Convite para organizar</td></tr>
        <tr><td style="font-size:15px;color:#1C1B18;line-height:1.5;padding-top:12px">
          Você foi convidado para ajudar a organizar <strong>${escapar(p.nomeEvento)}</strong> como <strong>${escapar(papelRotulo)}</strong>.
        </td></tr>
        <tr><td style="padding-top:20px">
          <a href="${link}" style="display:inline-block;background:#0E5C56;color:#fff;font-size:15px;font-weight:bold;padding:13px 28px;border-radius:999px;text-decoration:none">Aceitar convite</a>
        </td></tr>
        <tr><td style="font-size:12px;color:#6B675E;padding-top:16px">Se você não esperava este convite, ignore este e-mail.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  const res = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: FROM_EMAIL, name: FROM_NAME },
      to: [{ email: p.para }],
      subject: `Convite para organizar ${p.nomeEvento}`,
      htmlContent,
      textContent: `Você foi convidado para organizar "${p.nomeEvento}" como ${papelRotulo}. Aceite em: ${link}`,
      tags: ['convite'],
    }),
  })
  if (!res.ok) {
    const detalhe = await res.text().catch(() => '')
    throw new Error(`Brevo falhou (${res.status}): ${detalhe}`)
  }
  return res.json() as Promise<{ messageId: string }>
}
```

Nota: `BREVO_ENDPOINT`, `FROM_EMAIL`, `FROM_NAME`, `escapar` já existem no arquivo — não redeclarar.

- [ ] **Step 2: Actions de convite/revogação**

Create `app/eventos/[id]/(gerir)/equipe/actions.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createAdminSupabase } from '@/lib/supabase'
import { acessoEvento } from '@/lib/acesso'
import { gerarToken } from '@/lib/qr'
import { enviarConvite } from '@/lib/email'
import { emailValido } from '@/lib/mascaras'
import { PapelColaborador } from '@/types'

export async function convidarColaborador(eventoId: string, formData: FormData) {
  const acesso = await acessoEvento(eventoId)
  if (!acesso.ehDono) return { ok: false, erro: 'Apenas o dono do evento pode convidar.' }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const papel = String(formData.get('papel') ?? '') as PapelColaborador
  if (!emailValido(email)) return { ok: false, erro: 'E-mail inválido.' }
  if (papel !== 'editor' && papel !== 'checkin') return { ok: false, erro: 'Papel inválido.' }

  const admin = createAdminSupabase()

  // Nome do evento para o e-mail.
  const { data: ev } = await admin.from('eventos').select('nome').eq('id', eventoId).single()
  if (!ev) return { ok: false, erro: 'Evento não encontrado.' }

  const token = gerarToken()
  // upsert por (evento, email): reconvidar troca papel/token e volta a pendente.
  const { error } = await admin
    .from('colaboradores')
    .upsert(
      { evento_id: eventoId, email, papel, token, status: 'pendente', user_id: null },
      { onConflict: 'evento_id,email' }
    )
  if (error) return { ok: false, erro: 'Não foi possível registrar o convite.' }

  try {
    await enviarConvite({ para: email, nomeEvento: (ev as { nome: string }).nome, papel, token })
  } catch {
    // A linha já existe; o dono pode reenviar. Não falha o convite por causa do e-mail.
  }

  revalidatePath(`/eventos/${eventoId}`)
  return { ok: true }
}

export async function revogarColaborador(eventoId: string, colaboradorId: string) {
  const acesso = await acessoEvento(eventoId)
  if (!acesso.ehDono) return { ok: false, erro: 'Apenas o dono do evento pode revogar.' }

  const { error } = await createAdminSupabase()
    .from('colaboradores')
    .delete()
    .eq('id', colaboradorId)
    .eq('evento_id', eventoId)
  if (error) return { ok: false, erro: 'Não foi possível revogar.' }

  revalidatePath(`/eventos/${eventoId}`)
  return { ok: true }
}
```

- [ ] **Step 3: Action de aceite**

Create `app/convite/[token]/actions.ts`:

```typescript
'use server'

import { createServerSupabase, createAdminSupabase } from '@/lib/supabase'
import { tokenValido } from '@/lib/qr'

export async function aceitarConvite(token: string) {
  if (!tokenValido(token)) return { ok: false, erro: 'Convite inválido.' }

  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, erro: 'Faça login para aceitar o convite.' }

  const admin = createAdminSupabase()
  const { data: conv } = await admin
    .from('colaboradores')
    .select('id, email, evento_id, status')
    .eq('token', token)
    .maybeSingle()
  if (!conv) return { ok: false, erro: 'Convite não encontrado.' }
  const c = conv as { id: string; email: string; evento_id: string; status: string }

  const emailUser = (user.email ?? '').toLowerCase()
  if (emailUser !== c.email.toLowerCase()) {
    return { ok: false, erro: 'Este convite é para outro e-mail. Entre com a conta convidada.' }
  }

  const { error } = await admin
    .from('colaboradores')
    .update({ status: 'ativo', user_id: user.id })
    .eq('id', c.id)
  if (error) return { ok: false, erro: 'Não foi possível aceitar o convite.' }

  return { ok: true, eventoId: c.evento_id }
}
```

- [ ] **Step 4: Build**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add lib/email.ts "app/eventos/[id]/(gerir)/equipe/actions.ts" "app/convite/[token]/actions.ts"
git commit -m "feat: actions de convite, aceite e revogacao + e-mail de convite"
```

---

## Task 5: Reivindicar convites por e-mail ao autenticar

**Files:**
- Modify: `app/auth/callback/route.ts` (após criar a sessão, grudar convites do e-mail)
- Test: `lib/convites.test.ts`
- Create: `lib/convites.ts` (função pura de filtro, testável)

**Interfaces:**
- Produces: `function convitesParaReivindicar(convites, userId) → ids[]` (puro); efeito no callback.
- Consumes: `createAdminSupabase`.

- [ ] **Step 1: Teste da função pura**

Create `lib/convites.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { convitesParaReivindicar } from './convites'

describe('convitesParaReivindicar', () => {
  it('retorna ids de convites sem user_id', () => {
    const linhas = [
      { id: 'a', user_id: null },
      { id: 'b', user_id: 'outro' },
      { id: 'c', user_id: null },
    ]
    expect(convitesParaReivindicar(linhas)).toEqual(['a', 'c'])
  })
  it('lista vazia', () => {
    expect(convitesParaReivindicar([])).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar (falha)**

Run: `npx vitest run lib/convites.test.ts`
Expected: FAIL — não existe.

- [ ] **Step 3: Implementar `lib/convites.ts`**

```typescript
// Convites pendentes de um e-mail que ainda não têm user_id vinculado.
export function convitesParaReivindicar(linhas: { id: string; user_id: string | null }[]): string[] {
  return linhas.filter((l) => l.user_id === null).map((l) => l.id)
}
```

- [ ] **Step 4: Rodar (passa)**

Run: `npx vitest run lib/convites.test.ts`
Expected: PASS.

- [ ] **Step 5: Usar no callback de auth**

Em `app/auth/callback/route.ts`, após a sessão ser estabelecida e o usuário conhecido, antes do redirect final, adicionar (usando admin para contornar RLS ao gravar `user_id`):

```typescript
import { createAdminSupabase } from '@/lib/supabase'
import { convitesParaReivindicar } from '@/lib/convites'
// ...após obter `user` com e-mail:
if (user?.email) {
  const admin = createAdminSupabase()
  const { data: pend } = await admin
    .from('colaboradores')
    .select('id, user_id')
    .eq('status', 'pendente')
    .ilike('email', user.email)
  const ids = convitesParaReivindicar((pend ?? []) as { id: string; user_id: string | null }[])
  if (ids.length) {
    await admin.from('colaboradores').update({ user_id: user.id }).in('id', ids)
  }
}
```

(Se a estrutura do callback não expuser `user` facilmente, obter via `supabase.auth.getUser()` no mesmo handler antes do redirect.)

- [ ] **Step 6: Build + testes**

Run: `npx tsc --noEmit && npx vitest run`
Expected: sem erros; todos os testes passam.

- [ ] **Step 7: Commit**

```bash
git add lib/convites.ts lib/convites.test.ts app/auth/callback/route.ts
git commit -m "feat: grudar convites pendentes no user ao autenticar por e-mail"
```

---

## Task 6: UI — seção Equipe, tela de aceite, selo no dashboard

**Files:**
- Modify: `app/eventos/[id]/AbasEvento.tsx` (prop `podeEditar` para esconder abas de quem é checkin — opcional, mínimo: manter todas visíveis mas guardas já barram)
- Create: `app/eventos/[id]/(gerir)/inscritos/Equipe.tsx` (client: form convidar + lista + revogar)
- Modify: `app/eventos/[id]/(gerir)/inscritos/page.tsx` (renderizar `<Equipe>` só para o dono)
- Create: `app/convite/[token]/page.tsx` + `app/convite/[token]/Aceite.tsx`
- Modify: `app/dashboard/page.tsx` (incluir eventos onde sou colaborador, com selo)
- Modify: `components/EventCard.tsx` (prop opcional `papelColaborador` → selo)

**Interfaces:**
- Consumes: actions da Task 4 (`convidarColaborador`, `revogarColaborador`, `aceitarConvite`), `Colaborador`/`PapelColaborador`.

- [ ] **Step 1: Componente Equipe (client)**

Create `app/eventos/[id]/(gerir)/inscritos/Equipe.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Colaborador } from '@/types'
import { convidarColaborador, revogarColaborador } from '../equipe/actions'

const PAPEIS = ['editor', 'checkin']
const rotuloPapel = (p: string) => (p === 'editor' ? 'Editor' : 'Check-in')

export function Equipe({ eventoId, colaboradores }: { eventoId: string; colaboradores: Colaborador[] }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [papel, setPapel] = useState('checkin')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function convidar() {
    setEnviando(true); setErro(null)
    const fd = new FormData()
    fd.set('email', email); fd.set('papel', papel)
    const res = await convidarColaborador(eventoId, fd)
    setEnviando(false)
    if (!res.ok) { setErro(res.erro ?? 'Falha ao convidar.'); return }
    setEmail(''); router.refresh()
  }

  async function revogar(id: string) {
    await revogarColaborador(eventoId, id)
    router.refresh()
  }

  return (
    <div className="card p-[22px]">
      <h2 className="text-lg font-semibold">Equipe</h2>
      <p className="text-xs text-muted mt-1 mb-4">
        Convide pessoas para ajudar. Editor mexe em tudo; check-in só faz a portaria.
      </p>

      <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto] items-start">
        <input
          className="input" type="text" inputMode="email" placeholder="email@exemplo.com"
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
        <Select name="papel" opcoes={PAPEIS.map(rotuloPapel)}
          value={rotuloPapel(papel)}
          onChange={(v) => setPapel(v === 'Editor' ? 'editor' : 'checkin')} />
        <Button type="button" onClick={convidar} disabled={enviando}>
          {enviando ? 'Enviando…' : 'Convidar'}
        </Button>
      </div>
      {erro && <p className="text-error text-sm mt-2">{erro}</p>}

      <ul className="mt-5 grid gap-2">
        {colaboradores.length === 0 && (
          <li className="text-sm text-muted">Ninguém convidado ainda.</li>
        )}
        {colaboradores.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 border border-line rounded-xl px-3.5 py-2.5">
            <div className="min-w-0">
              <div className="text-sm font-semibold break-words">{c.email}</div>
              <div className="text-xs text-muted">
                {rotuloPapel(c.papel)} · {c.status === 'ativo' ? 'ativo' : 'convite pendente'}
              </div>
            </div>
            <button onClick={() => revogar(c.id)} className="text-error text-sm shrink-0 hover:underline">
              Revogar
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Renderizar Equipe na aba Gerenciamento (só dono)**

Em `app/eventos/[id]/(gerir)/inscritos/page.tsx`, após o conteúdo atual, buscar colaboradores e renderizar para o dono:

```tsx
import { acessoEvento } from '@/lib/acesso'
import { Equipe } from './Equipe'
import { Colaborador } from '@/types'
// ...
const acesso = await acessoEvento(params.id)
if (!acesso.podeVer) notFound()
// ...após a lista de inscritos:
{acesso.ehDono && (
  <div className="mt-8">
    <Equipe eventoId={params.id} colaboradores={(colaboradores ?? []) as Colaborador[]} />
  </div>
)}
```

Onde `colaboradores` vem de:
```typescript
const { data: colaboradores } = await createAdminSupabase()
  .from('colaboradores').select('*').eq('evento_id', params.id).order('created_at')
```

- [ ] **Step 3: Tela de aceite**

Create `app/convite/[token]/Aceite.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { aceitarConvite } from './actions'

export function Aceite({ token, nomeEvento, papel }: { token: string; nomeEvento: string; papel: string }) {
  const router = useRouter()
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function aceitar() {
    setEnviando(true); setErro(null)
    const res = await aceitarConvite(token)
    if (res.ok && res.eventoId) { router.push(`/eventos/${res.eventoId}`); return }
    setEnviando(false); setErro(res.erro ?? 'Não foi possível aceitar.')
  }

  return (
    <div className="max-w-[440px] mx-auto px-6 py-16 text-center">
      <h1 className="font-display text-2xl font-semibold text-secondary">Convite para organizar</h1>
      <p className="text-muted mt-2">
        Você foi convidado para <strong>{nomeEvento}</strong> como <strong>{papel}</strong>.
      </p>
      <Button type="button" onClick={aceitar} disabled={enviando} block className="mt-6">
        {enviando ? 'Aceitando…' : 'Aceitar convite'}
      </Button>
      {erro && <p className="text-error text-sm mt-3">{erro}</p>}
    </div>
  )
}
```

Create `app/convite/[token]/page.tsx`:

```tsx
import { notFound, redirect } from 'next/navigation'
import { createAdminSupabase, createServerSupabase } from '@/lib/supabase'
import { tokenValido } from '@/lib/qr'
import { Aceite } from './Aceite'

export default async function ConvitePage({ params }: { params: { token: string } }) {
  if (!tokenValido(params.token)) notFound()

  const admin = createAdminSupabase()
  const { data: conv } = await admin
    .from('colaboradores')
    .select('papel, status, evento_id, eventos(nome)')
    .eq('token', params.token)
    .maybeSingle()
  if (!conv) notFound()
  const c = conv as { papel: string; status: string; evento_id: string; eventos: { nome: string } }

  // Já aceito? manda pro evento.
  if (c.status === 'ativo') redirect(`/eventos/${c.evento_id}`)

  // Precisa estar logado para aceitar.
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/convite/${params.token}`)

  const rotulo = c.papel === 'editor' ? 'editor' : 'check-in'
  return <Aceite token={params.token} nomeEvento={c.eventos?.nome ?? 'evento'} papel={rotulo} />
}
```

- [ ] **Step 4: Dashboard inclui eventos onde sou colaborador**

Em `app/dashboard/page.tsx`, além dos eventos do dono (RLS já traz via `pode_ver_evento`), marcar quais são colaboração. Buscar os papéis do usuário:

```typescript
// ids -> papel dos eventos onde o usuário é colaborador ativo (não dono)
const { data: cols } = await supabase
  .from('colaboradores').select('evento_id, papel')
  .eq('user_id', user.id).eq('status', 'ativo')
const papelPorEvento = new Map((cols ?? []).map((c: { evento_id: string; papel: string }) => [c.evento_id, c.papel]))
```

Ao renderizar cada `EventCard`, passar `papelColaborador={evento.user_id === user.id ? undefined : papelPorEvento.get(evento.id)}`.

Nota: a query do dashboard já confia só na RLS (não tem `.eq('user_id', ...)`; ver `app/dashboard/page.tsx:16-22`). Como `pode_ver_evento` passa a liberar SELECT em `eventos` para colaboradores, o dashboard já retornará também os eventos colaborados — não é preciso mudar a query, só marcar o selo com o `papelPorEvento`.

- [ ] **Step 5: Selo no EventCard**

Em `components/EventCard.tsx`, aceitar prop opcional e exibir selo:

```tsx
// na assinatura:
export function EventCard({ evento, papelColaborador }: { evento: EventoComStats; papelColaborador?: string }) {
// abaixo do nome:
{papelColaborador && (
  <span className="badge badge-inscrito mt-1 inline-block">
    Colaborador · {papelColaborador === 'editor' ? 'Editor' : 'Check-in'}
  </span>
)}
```

- [ ] **Step 6: Build + testes + smoke**

Run: `npx tsc --noEmit && npx vitest run && npx next build 2>&1 | grep -E "Compiled|Failed|error|/convite"`
Expected: compila; testes passam; rota `/convite/[token]` listada.

- [ ] **Step 7: Commit**

```bash
git add "app/eventos/[id]" "app/convite" app/dashboard/page.tsx components/EventCard.tsx
git commit -m "feat: UI de equipe, tela de aceite de convite e selo de colaborador"
```

---

## Task 7: Verificação end-to-end (prod)

**Files:** nenhum (validação).

- [ ] **Step 1: Deploy**

```bash
git push
```
Aguardar o deploy da Vercel (~90s).

- [ ] **Step 2: ⚠️ AÇÃO DO USUÁRIO — teste manual**

Com dois e-mails (um dono, um convidado):
1. Dono abre um evento → Gerenciamento → Equipe → convida o segundo e-mail como `checkin`.
2. Convidado recebe e-mail, abre `/convite/[token]`, loga/cria conta com aquele e-mail, aceita.
3. Convidado vê o evento no dashboard com selo "Colaborador · Check-in", consegue abrir Check-in, **não** vê botão "Editar".
4. Dono revoga → convidado perde o acesso (evento some do dashboard dele).

- [ ] **Step 3: Ajustar o que aparecer** e commitar correções pontuais.
