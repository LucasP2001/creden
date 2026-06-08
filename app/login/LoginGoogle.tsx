'use client'

import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase-browser'

// Botão "Entrar com Google" — inicia o fluxo OAuth do Supabase.
// Redireciona para /auth/callback, que troca o code pela sessão.
export function LoginGoogle({ next }: { next?: string }) {
  const [carregando, setCarregando] = useState(false)

  async function entrar() {
    setCarregando(true)
    const supabase = createBrowserSupabase()
    const redirectTo = new URL('/auth/callback', window.location.origin)
    if (next) redirectTo.searchParams.set('next', next)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo.toString() },
    })
    if (error) {
      setCarregando(false)
      window.location.href = '/login?erro=1'
    }
    // Em sucesso, o browser é redirecionado para o Google.
  }

  return (
    <button onClick={entrar} disabled={carregando} className="btn btn-secondary w-full justify-center">
      <GoogleIcon />
      {carregando ? 'Redirecionando…' : 'Entrar com Google'}
    </button>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.5 29.3 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.5 29.3 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 43.5c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.6 2.4-7.2 2.4-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.6 39 16.2 43.5 24 43.5z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.2 5.2c-.4.4 6.6-4.8 6.6-14.6 0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  )
}
