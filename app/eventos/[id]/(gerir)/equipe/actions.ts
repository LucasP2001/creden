'use server'

import { revalidatePath } from 'next/cache'
import { createAdminSupabase } from '@/lib/supabase'
import { acessoEvento } from '@/lib/acesso'
import { gerarToken } from '@/lib/qr'
// gerarToken usado tanto no primeiro convite quanto ao reabrir um recusado.
import { enviarConvite, motivoBloqueio } from '@/lib/email'
import { emailValido } from '@/lib/mascaras'
import { PapelColaborador } from '@/types'

export async function convidarColaborador(eventoId: string, formData: FormData) {
  const acesso = await acessoEvento(eventoId)
  // Dono ou colaborador 'editor' podem convidar. Revogar continua só do dono.
  if (!acesso.podeEditar) {
    return { ok: false, erro: 'Você não tem permissão para convidar neste evento.' }
  }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const papel = String(formData.get('papel') ?? '') as PapelColaborador
  if (!emailValido(email)) return { ok: false, erro: 'E-mail inválido.' }
  if (papel !== 'editor' && papel !== 'checkin') return { ok: false, erro: 'Papel inválido.' }

  // O Brevo aceita o envio (201) mas descarta quem está na blocklist (bounce,
  // spam ou "descadastrar"). Checa antes para não registrar convite que nunca
  // chega e avisar o dono com clareza, em vez de fingir sucesso.
  const bloqueio = await motivoBloqueio(email)
  if (bloqueio) {
    return {
      ok: false,
      erro: 'Este e-mail optou por não receber nossos e-mails e não pode ser convidado. Peça à pessoa para verificar ou use outro endereço.',
    }
  }

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
  } catch (e) {
    // A linha já existe; o dono pode reenviar. Não falha o convite por causa do
    // e-mail, mas registra para depurar (chave/remetente Brevo, etc.).
    console.error('Falha ao enviar e-mail de convite:', e)
  }

  revalidatePath(`/eventos/${eventoId}`)
  return { ok: true }
}

export async function reenviarConvite(eventoId: string, colaboradorId: string) {
  const acesso = await acessoEvento(eventoId)
  // Quem convida também reenvia: dono ou editor.
  if (!acesso.podeEditar) {
    return { ok: false, erro: 'Você não tem permissão para reenviar convites neste evento.' }
  }

  const admin = createAdminSupabase()
  const { data: colab } = await admin
    .from('colaboradores')
    .select('email, papel, status, token')
    .eq('id', colaboradorId)
    .eq('evento_id', eventoId)
    .maybeSingle()
  if (!colab) return { ok: false, erro: 'Convite não encontrado.' }
  const c = colab as { email: string; papel: PapelColaborador; status: string; token: string }

  if (c.status === 'ativo') return { ok: false, erro: 'Este convite já foi aceito.' }

  const bloqueio = await motivoBloqueio(c.email)
  if (bloqueio) {
    return {
      ok: false,
      erro: 'Este e-mail optou por não receber nossos e-mails. Peça à pessoa para verificar ou use outro endereço.',
    }
  }

  const { data: ev } = await admin.from('eventos').select('nome').eq('id', eventoId).single()
  if (!ev) return { ok: false, erro: 'Evento não encontrado.' }

  // Recusado que é reenviado reabre: novo token (o antigo pode ter vazado) e
  // volta a 'pendente'. Pendente reenvia com o mesmo token.
  let token = c.token
  if (c.status === 'recusado') {
    token = gerarToken()
    const { error } = await admin
      .from('colaboradores')
      .update({ status: 'pendente', token, user_id: null })
      .eq('id', colaboradorId)
      .eq('evento_id', eventoId)
    if (error) return { ok: false, erro: 'Não foi possível reabrir o convite.' }
  }

  try {
    await enviarConvite({ para: c.email, nomeEvento: (ev as { nome: string }).nome, papel: c.papel, token })
  } catch (e) {
    console.error('Falha ao reenviar e-mail de convite:', e)
    return { ok: false, erro: 'Não foi possível enviar o e-mail. Tente de novo em instantes.' }
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
