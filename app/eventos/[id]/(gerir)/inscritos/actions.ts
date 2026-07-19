'use server'

import { revalidatePath } from 'next/cache'
import { createAdminSupabase } from '@/lib/supabase'
import { acessoEvento } from '@/lib/acesso'
import { enviarIngresso } from '@/lib/email'
import { formatarDataHora, rotuloCidadeFuso } from '@/lib/datas'
import { gerarToken } from '@/lib/qr'
import { gravarMarcacoes } from '@/lib/marcacoes'
import { validarNomeEmail, checarVagas, validarCamposExtras, checarDuplicado } from '@/lib/inscricao'
import { todasSessoes } from '@/lib/sessoes'
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

/**
 * Cadastra um inscrito manualmente (balcão). Mesmas validações do fluxo público
 * (nome/e-mail, vagas, campos extras, duplicado). Grava as sessões escolhidas e
 * envia o bilhete. Só dono/editor.
 */
export async function adicionarInscrito(
  eventoId: string,
  formData: FormData,
  sessaoIds: string[]
): Promise<AcaoResult & { aviso?: string }> {
  const acesso = await acessoEvento(eventoId)
  if (!acesso.podeEditar) {
    return { ok: false, erro: 'Você não tem permissão para adicionar inscritos neste evento.' }
  }

  const admin = createAdminSupabase()
  const { data: evRow } = await admin.from('eventos').select('*').eq('id', eventoId).single()
  if (!evRow) return { ok: false, erro: 'Evento não encontrado.' }
  const evento = evRow as Evento

  const dadosBasicos = validarNomeEmail(formData)
  if (!dadosBasicos.ok) return { ok: false, erro: dadosBasicos.erro }
  const { nome, email } = dadosBasicos

  const vagas = await checarVagas(admin, evento)
  if (!vagas.ok) return { ok: false, erro: vagas.erro }

  const camposExtras = validarCamposExtras(evento, formData)
  if (!camposExtras.ok) return { ok: false, erro: camposExtras.erro }
  const { dadosExtras, cpfLabel, cpfDigitos } = camposExtras

  const dup = await checarDuplicado(admin, evento, email, cpfLabel, cpfDigitos)
  if (!dup.ok) return { ok: false, erro: dup.erro }

  const token = gerarToken()
  const { data: inserida, error } = await admin
    .from('inscricoes')
    .insert({ evento_id: eventoId, nome, email, dados_extras: dadosExtras, status: 'inscrito', token })
    .select('id')
    .single()
  if (error || !inserida) return { ok: false, erro: 'Não foi possível adicionar o inscrito.' }

  const rejeitadas = await gravarMarcacoes(
    admin,
    eventoId,
    (inserida as { id: string }).id,
    sessaoIds.map(String),
    evento.dias ?? []
  )

  try {
    await enviarIngresso({
      para: email,
      nomeParticipante: nome,
      nomeEvento: evento.nome,
      dataEvento: `${formatarDataHora(evento.data_hora, evento.fuso)} (${rotuloCidadeFuso(evento.fuso)})`,
      local: evento.local ?? '',
      token,
    })
  } catch (e) {
    console.error('Falha ao enviar bilhete do inscrito manual:', e)
  }

  revalidatePath(`/eventos/${eventoId}/inscritos`)
  if (rejeitadas.length > 0) {
    return { ok: true, aviso: `Inscrito adicionado. Sessões lotadas não incluídas: ${rejeitadas.join(', ')}.` }
  }
  return { ok: true }
}

export interface SessaoResumo {
  id: string
  titulo: string
  hora_inicio: string
}

/** Sessões marcadas por um inscrito (para o popup de detalhe). Requer podeVer. */
export async function sessoesDoInscrito(
  eventoId: string,
  inscricaoId: string
): Promise<{ ok: boolean; sessoes?: SessaoResumo[]; erro?: string }> {
  const acesso = await acessoEvento(eventoId)
  if (!acesso.podeVer) return { ok: false, erro: 'Sem acesso.' }

  const admin = createAdminSupabase()
  const [{ data: evRow }, { data: marc }] = await Promise.all([
    admin.from('eventos').select('dias').eq('id', eventoId).single(),
    admin.from('inscricoes_sessoes').select('sessao_id').eq('inscricao_id', inscricaoId).eq('evento_id', eventoId),
  ])
  if (!evRow) return { ok: false, erro: 'Evento não encontrado.' }

  const dias = (evRow as Pick<Evento, 'dias'>).dias ?? []
  const porId = new Map(todasSessoes(dias).map((s) => [s.id, s]))
  const ids = (marc ?? []).map((r) => (r as { sessao_id: string }).sessao_id)

  const sessoes: SessaoResumo[] = ids
    .map((id) => porId.get(id))
    .filter((s): s is NonNullable<typeof s> => !!s)
    .map((s) => ({ id: s.id, titulo: s.titulo, hora_inicio: s.hora_inicio }))
    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))

  return { ok: true, sessoes }
}
