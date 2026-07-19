import { notFound, redirect } from 'next/navigation'
import { createAdminSupabase, createServerSupabase } from '@/lib/supabase'
import { tokenValido } from '@/lib/qr'
import { Aceite } from './Aceite'

// Tela pública de aceite de convite de colaboração (/convite/[token]).
// Convite já aceito -> manda pro evento. Sem sessão -> manda pro login e volta aqui.
export default async function ConvitePage({ params }: { params: { token: string } }) {
  if (!tokenValido(params.token)) notFound()

  const admin = createAdminSupabase()
  const { data: conv } = await admin
    .from('colaboradores')
    .select('papel, status, evento_id, eventos(nome)')
    .eq('token', params.token)
    .maybeSingle()
  if (!conv) notFound()
  const c = conv as {
    papel: string
    status: string
    evento_id: string
    eventos: { nome: string } | { nome: string }[] | null
  }
  const nomeEvento = (Array.isArray(c.eventos) ? c.eventos[0]?.nome : c.eventos?.nome) ?? 'evento'

  // Já aceito? manda pro evento.
  if (c.status === 'ativo') redirect(`/eventos/${c.evento_id}`)

  // Precisa estar logado para aceitar.
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/convite/${params.token}`)

  const rotulo = c.papel === 'editor' ? 'editor' : 'check-in'
  return <Aceite token={params.token} nomeEvento={nomeEvento} papel={rotulo} />
}
