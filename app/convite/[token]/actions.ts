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

/**
 * Recusa o convite: só quem tem o e-mail convidado pode. Marca status='recusado'
 * em vez de apagar a linha — assim reabrir o link mostra "convite recusado", não
 * "não encontrado". Para reabrir, o dono reenvia o convite (volta a 'pendente').
 */
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
    .select('id, email, status')
    .eq('token', token)
    .maybeSingle()
  if (!conv) return { ok: false, erro: 'Convite não encontrado.' }
  const c = conv as { id: string; email: string; status: string }

  const emailUser = (user.email ?? '').toLowerCase()
  if (emailUser !== c.email.toLowerCase()) {
    return { ok: false, erro: 'Este convite é para outro e-mail.' }
  }

  // Já ativo não pode ser "recusado" por aqui — sairia da equipe sem querer.
  if (c.status === 'ativo') {
    return { ok: false, erro: 'Você já faz parte da equipe deste evento.' }
  }

  const { error } = await admin
    .from('colaboradores')
    .update({ status: 'recusado' })
    .eq('id', c.id)
  if (error) return { ok: false, erro: 'Não foi possível recusar o convite.' }

  return { ok: true }
}
