'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase'
import { uploadCapa } from '@/lib/capa'
import { montarPayloadUpdate } from './payload'

export interface AtualizarEventoResult {
  ok: boolean
  erro?: string
}

/**
 * Atualiza um evento do organizador logado. Slug não muda. Capa é opcional.
 * RLS força dono; a guarda de user_id dá erro claro. Em sucesso, redireciona.
 */
export async function atualizarEvento(
  eventoId: string,
  formData: FormData
): Promise<AtualizarEventoResult> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, erro: 'Sessão expirada. Entre novamente.' }

  const { data: dono } = await supabase
    .from('eventos')
    .select('user_id, slug')
    .eq('id', eventoId)
    .single()
  if (!dono || dono.user_id !== user.id) {
    return { ok: false, erro: 'Evento não encontrado.' }
  }

  const { payload, erro } = montarPayloadUpdate(formData)
  if (erro) return { ok: false, erro }

  // Capa opcional: se veio arquivo novo válido, sobrescreve e inclui a URL.
  const url = await uploadCapa(supabase, user.id, eventoId, formData.get('capa'))
  const dadosUpdate = url ? { ...payload, imagem_url: url } : payload

  const { error } = await supabase.from('eventos').update(dadosUpdate).eq('id', eventoId)
  if (error) return { ok: false, erro: 'Não foi possível salvar as alterações.' }

  revalidatePath('/dashboard')
  revalidatePath(`/e/${dono.slug}`)
  redirect('/dashboard')
}
