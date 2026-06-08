// Clients Supabase server-only (skill creden-supabase).
// - createServerSupabase(): Server Components / Route Handlers — lê cookies de sessão.
// - createAdminSupabase(): SÓ servidor, service_role — ignora RLS. Use com cuidado.
//
// Para o browser, importe createBrowserSupabase de '@/lib/supabase-browser'
// (este arquivo importa next/headers e não pode ir para um bundle de client).

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

type CookieToSet = { name: string; value: string; options: CookieOptions }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Client para Server Components / Route Handlers.
 * Lê e escreve cookies de sessão. Em Server Components o setAll pode falhar
 * silenciosamente (ok se houver middleware de refresh de sessão).
 */
export async function createServerSupabase() {
  const cookieStore = await cookies()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Chamado de um Server Component — pode ser ignorado com middleware de refresh.
        }
      },
    },
  })
}

/**
 * Client admin (service_role) — ignora RLS. Use APENAS no servidor, em casos
 * controlados (ex: ler ingresso por token, enviar e-mail). Nunca no browser.
 */
export function createAdminSupabase() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
