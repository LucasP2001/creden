// Client Supabase para o browser (componentes 'use client'). Usa a anon key.
// Separado de supabase.ts porque aquele importa next/headers (server-only) e
// não pode ser incluído num bundle de client.
import { createBrowserClient } from '@supabase/ssr'

export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
