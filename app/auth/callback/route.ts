import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

// Callback do OAuth: o Google/Supabase redireciona pra cá com ?code=,
// que trocamos pela sessão (cookies). Depois manda pro destino (next) ou /dashboard.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  let next = searchParams.get('next') ?? '/dashboard'
  if (!next.startsWith('/')) next = '/dashboard' // evita open redirect

  if (code) {
    const supabase = await createServerSupabase()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocal = process.env.NODE_ENV === 'development'
      if (isLocal) return NextResponse.redirect(`${origin}${next}`)
      if (forwardedHost) return NextResponse.redirect(`https://${forwardedHost}${next}`)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Falhou: volta pro login com flag de erro.
  return NextResponse.redirect(`${origin}/login?erro=1`)
}
