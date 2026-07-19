'use server'

import { revalidatePath } from 'next/cache'
import { createAdminSupabase } from '@/lib/supabase'
import { acessoEvento } from '@/lib/acesso'
import { gerarToken } from '@/lib/qr'
import { enviarConvite } from '@/lib/email'
import { emailValido } from '@/lib/mascaras'
import { PapelColaborador } from '@/types'

export async function convidarColaborador(eventoId: string, formData: FormData) {
  const acesso = await acessoEvento(eventoId)
  if (!acesso.ehDono) return { ok: false, erro: 'Apenas o dono do evento pode convidar.' }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const papel = String(formData.get('papel') ?? '') as PapelColaborador
  if (!emailValido(email)) return { ok: false, erro: 'E-mail inválido.' }
  if (papel !== 'editor' && papel !== 'checkin') return { ok: false, erro: 'Papel inválido.' }

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
