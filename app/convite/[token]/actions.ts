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

/** Recusa o convite: só quem tem o e-mail convidado pode, e a linha é removida. */
export async function recusarConvite(token: string) {
  if (!tokenValido(token)) return { ok: false, erro: 'Convite inválido.' }

  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, erro: 'Faça login para responder ao convite.' }

  const admin = createAdminSupabase()
  const { data: conv } = await admin
    .from('colaboradores')
    .select('id, email')
    .eq('token', token)
    .maybeSingle()
  if (!conv) return { ok: false, erro: 'Convite não encontrado.' }
  const c = conv as { id: string; email: string }

  const emailUser = (user.email ?? '').toLowerCase()
  if (emailUser !== c.email.toLowerCase()) {
    return { ok: false, erro: 'Este convite é para outro e-mail.' }
  }

  const { error } = await admin.from('colaboradores').delete().eq('id', c.id)
  if (error) return { ok: false, erro: 'Não foi possível recusar o convite.' }

  return { ok: true }
}
