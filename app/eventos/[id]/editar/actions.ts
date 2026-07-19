'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase'
import { acessoEvento } from '@/lib/acesso'
import { uploadCapa } from '@/lib/capa'
import { limparOrfaos } from '@/lib/marcacoes'
import { montarPayloadUpdate } from './payload'

export interface AtualizarEventoResult {
  ok: boolean
  erro?: string
}

/**
 * Atualiza um evento do organizador logado ou de um colaborador com papel
 * 'editor'. Slug não muda. Capa é opcional. Em sucesso, redireciona.
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

  const acesso = await acessoEvento(eventoId)
  if (!acesso.podeEditar) {
    return { ok: false, erro: 'Você não tem permissão para editar este evento.' }
  }

  const { data: ev } = await createAdminSupabase()
    .from('eventos')
    .select('slug')
    .eq('id', eventoId)
    .single()

  const { payload, erro } = montarPayloadUpdate(formData)
  if (erro) return { ok: false, erro }

  // Capa opcional: se veio arquivo novo válido, sobrescreve e inclui a URL.
  const url = await uploadCapa(supabase, user.id, eventoId, formData.get('capa'))
  const dadosUpdate = url ? { ...payload, imagem_url: url } : payload

  const { error } = await supabase.from('eventos').update(dadosUpdate).eq('id', eventoId)
  if (error) return { ok: false, erro: 'Não foi possível salvar as alterações.' }

  await limparOrfaos(createAdminSupabase(), eventoId, payload.dias)

  revalidatePath('/dashboard')
  revalidatePath(`/e/${ev?.slug}`)
  redirect('/dashboard')
}
