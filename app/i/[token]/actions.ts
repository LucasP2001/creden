'use server'

import { createAdminSupabase } from '@/lib/supabase'
import { enviarIngresso } from '@/lib/email'
import { reconciliarMarcacoes } from '@/lib/marcacoes'
import { revalidatePath } from 'next/cache'
import { Evento, Inscricao } from '@/types'

export interface ReenviarResult {
  ok: boolean
  erro?: string
}

// Reenvia o ingresso por e-mail a partir do token. Usado na tela /i/[token].
export async function reenviarIngresso(token: string): Promise<ReenviarResult> {
  const supabase = createAdminSupabase()
  const { data } = await supabase
    .from('inscricoes')
    .select('*, eventos(*)')
    .eq('token', token)
    .single()

  if (!data) return { ok: false, erro: 'Ingresso não encontrado.' }

  const insc = data as Inscricao & { eventos: Evento }
  const ev = insc.eventos

  try {
    await enviarIngresso({
      para: insc.email,
      nomeParticipante: insc.nome,
      nomeEvento: ev.nome,
      dataEvento: new Date(ev.data_hora).toLocaleString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      local: ev.local ?? '',
      token: insc.token,
    })
    return { ok: true }
  } catch (e) {
    console.error('Falha ao reenviar ingresso:', e)
    return { ok: false, erro: 'Não foi possível reenviar agora. Tente mais tarde.' }
  }
}

export interface AtualizarSessoesResult {
  ok: boolean
  erro?: string
  aviso?: string
}

// Reconcilia as marcações de sessão da inscrição a partir do ingresso (/i/[token]).
export async function atualizarSessoes(
  token: string,
  sessaoIds: string[]
): Promise<AtualizarSessoesResult> {
  const admin = createAdminSupabase()
  const { data } = await admin
    .from('inscricoes')
    .select('*, eventos(*)')
    .eq('token', token)
    .single()
  if (!data) return { ok: false, erro: 'Ingresso não encontrado.' }

  const insc = data as Inscricao & { eventos: Evento }
  const ev = insc.eventos
  const rejeitadas = await reconciliarMarcacoes(
    admin,
    ev.id,
    insc.id,
    sessaoIds.map(String),
    ev.dias
  )
  revalidatePath(`/i/${token}`)
  if (rejeitadas.length > 0) {
    return { ok: true, aviso: `Não foi possível entrar em: ${rejeitadas.join(', ')} (lotadas).` }
  }
  return { ok: true }
}
