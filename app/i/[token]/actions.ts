'use server'

import { createAdminSupabase } from '@/lib/supabase'
import { enviarIngresso } from '@/lib/email'
import { reconciliarMarcacoes } from '@/lib/marcacoes'
import { inscricoesAbertas } from '@/lib/periodo'
import { formatarDataHora } from '@/lib/datas'
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
      dataEvento: formatarDataHora(ev.data_hora),
      local: ev.local ?? '',
      token: insc.token,
    })
    return { ok: true }
  } catch (e) {
    console.error('Falha ao reenviar ingresso:', e)
    return { ok: false, erro: 'Não foi possível reenviar agora. Tente mais tarde.' }
  }
}

// Recupera o acesso: participante informa o e-mail com que se inscreveu num evento
// (por slug) e recebe o link /i/[token] de novo. Resposta neutra (não revela se o
// e-mail existe) para não vazar quem está inscrito.
export async function reenviarPorEmail(slug: string, email: string): Promise<ReenviarResult> {
  const emailNorm = email.trim().toLowerCase()
  if (!emailNorm) return { ok: false, erro: 'Informe o e-mail.' }

  const supabase = createAdminSupabase()
  const { data: ev } = await supabase.from('eventos').select('id').eq('slug', slug).single()
  if (!ev) return { ok: false, erro: 'Evento não encontrado.' }

  const { data: insc } = await supabase
    .from('inscricoes')
    .select('token')
    .eq('evento_id', (ev as { id: string }).id)
    .eq('email', emailNorm)
    .neq('status', 'cancelado')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Se achou, reenvia. Resposta é sempre ok (neutra).
  if (insc) await reenviarIngresso((insc as { token: string }).token)
  return { ok: true }
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

  // Fora da janela de inscrição as escolhas ficam congeladas. Checado no servidor:
  // a UI vira só leitura, mas a action é pública (basta o token).
  if (!inscricoesAbertas(ev.inscricoes_abrem_em, ev.inscricoes_fecham_em)) {
    return { ok: false, erro: 'O prazo para escolher palestras está encerrado.' }
  }

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
