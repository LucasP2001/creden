import { NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase'
import { convitesParaReivindicar } from '@/lib/convites'

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
      // Gruda convites de colaborador pendentes cujo e-mail bate com o do
      // usuário autenticado (preenche user_id, mantém status pendente até aceite).
      const {
        data: { user },
      } = await supabase.auth.getUser()
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
