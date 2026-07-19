'use server'

import { revalidatePath } from 'next/cache'
import { createAdminSupabase } from '@/lib/supabase'
import { acessoEvento } from '@/lib/acesso'
import { enviarIngresso } from '@/lib/email'
import { formatarDataHora, rotuloCidadeFuso } from '@/lib/datas'
import { Evento, Inscricao } from '@/types'

export interface AcaoResult {
  ok: boolean
  erro?: string
}

/**
 * Confirma a presença de um inscrito manualmente (sem QR), a partir da lista.
 * Mesma escrita do check-in por câmera (status=presente + checkin_at). Permitida
 * a quem faz check-in: dono, editor ou colaborador 'checkin'.
 */
export async function marcarPresenca(eventoId: string, inscricaoId: string): Promise<AcaoResult> {
  const acesso = await acessoEvento(eventoId)
  if (!(acesso.podeEditar || acesso.papel === 'checkin')) {
    return { ok: false, erro: 'Você não tem permissão para fazer check-in neste evento.' }
  }

  const admin = createAdminSupabase()
  const { data: insc } = await admin
    .from('inscricoes')
    .select('status')
    .eq('id', inscricaoId)
    .eq('evento_id', eventoId)
    .maybeSingle()
  if (!insc) return { ok: false, erro: 'Inscrição não encontrada.' }
  if ((insc as Pick<Inscricao, 'status'>).status === 'cancelado') {
    return { ok: false, erro: 'Esta inscrição está cancelada.' }
  }
  if ((insc as Pick<Inscricao, 'status'>).status === 'presente') {
    return { ok: false, erro: 'Este inscrito já entrou.' }
  }

  const { error } = await admin
    .from('inscricoes')
    .update({ status: 'presente', checkin_at: new Date().toISOString() })
    .eq('id', inscricaoId)
    .eq('evento_id', eventoId)
  if (error) return { ok: false, erro: 'Não foi possível confirmar a presença.' }

  revalidatePath(`/eventos/${eventoId}/inscritos`)
  return { ok: true }
}

/**
 * Desfaz um check-in feito por engano: volta 'presente' para 'inscrito' e limpa
 * o horário. Só dono/editor.
 */
export async function desfazerPresenca(eventoId: string, inscricaoId: string): Promise<AcaoResult> {
  const acesso = await acessoEvento(eventoId)
  if (!(acesso.podeEditar || acesso.papel === 'checkin')) {
    return { ok: false, erro: 'Você não tem permissão para alterar o check-in.' }
  }

  const { error } = await createAdminSupabase()
    .from('inscricoes')
    .update({ status: 'inscrito', checkin_at: null })
    .eq('id', inscricaoId)
    .eq('evento_id', eventoId)
    .eq('status', 'presente')
  if (error) return { ok: false, erro: 'Não foi possível desfazer o check-in.' }

  revalidatePath(`/eventos/${eventoId}/inscritos`)
  return { ok: true }
}

/** Cancela uma inscrição (status=cancelado). Só dono/editor. */
export async function cancelarInscricao(eventoId: string, inscricaoId: string): Promise<AcaoResult> {
  const acesso = await acessoEvento(eventoId)
  if (!acesso.podeEditar) {
    return { ok: false, erro: 'Você não tem permissão para cancelar inscrições.' }
  }

  const { error } = await createAdminSupabase()
    .from('inscricoes')
    .update({ status: 'cancelado' })
    .eq('id', inscricaoId)
    .eq('evento_id', eventoId)
  if (error) return { ok: false, erro: 'Não foi possível cancelar a inscrição.' }

  revalidatePath(`/eventos/${eventoId}/inscritos`)
  return { ok: true }
}

/** Reenvia o bilhete (ingresso com QR) por e-mail para o inscrito. Só dono/editor. */
export async function reenviarBilhete(eventoId: string, inscricaoId: string): Promise<AcaoResult> {
  const acesso = await acessoEvento(eventoId)
  if (!acesso.podeEditar) {
    return { ok: false, erro: 'Você não tem permissão para reenviar bilhetes.' }
  }

  const admin = createAdminSupabase()
  const [{ data: evRow }, { data: inscRow }] = await Promise.all([
    admin.from('eventos').select('*').eq('id', eventoId).single(),
    admin
      .from('inscricoes')
      .select('nome, email, token, status')
      .eq('id', inscricaoId)
      .eq('evento_id', eventoId)
      .maybeSingle(),
  ])

  if (!evRow) return { ok: false, erro: 'Evento não encontrado.' }
  if (!inscRow) return { ok: false, erro: 'Inscrição não encontrada.' }
  const evento = evRow as Evento
  const insc = inscRow as Pick<Inscricao, 'nome' | 'email' | 'token' | 'status'>

  if (insc.status === 'cancelado') {
    return { ok: false, erro: 'Esta inscrição está cancelada.' }
  }

  try {
    await enviarIngresso({
      para: insc.email,
      nomeParticipante: insc.nome,
      nomeEvento: evento.nome,
      dataEvento: `${formatarDataHora(evento.data_hora, evento.fuso)} (${rotuloCidadeFuso(evento.fuso)})`,
      local: evento.local ?? '',
      token: insc.token,
    })
  } catch (e) {
    console.error('Falha ao reenviar bilhete:', e)
    return { ok: false, erro: 'Não foi possível enviar o e-mail. Tente de novo em instantes.' }
  }

  return { ok: true }
}
