'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase'
import { uploadCapa } from '@/lib/capa'

export interface TrocarCapaResult {
  ok: boolean
  erro?: string
}

// Troca a capa de um evento existente. RLS (dono) garante a autorização;
// o path {user_id}/{evento_id}.ext é sobrescrito (upsert) e a URL recebe
// cache-bust para forçar refresh do CDN/navegador.
export async function trocarCapa(formData: FormData): Promise<TrocarCapaResult> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, erro: 'Sessão expirada. Entre novamente.' }

  const eventoId = String(formData.get('evento_id') ?? '')
  if (!eventoId) return { ok: false, erro: 'Evento inválido.' }

  const capa = formData.get('capa')
  if (!(capa instanceof File) || capa.size === 0) {
    return { ok: false, erro: 'Escolha uma imagem.' }
  }
  const url = await uploadCapa(supabase, user.id, eventoId, capa)
  if (!url) return { ok: false, erro: 'Não foi possível enviar a imagem.' }

  const { error: dbErr } = await supabase
    .from('eventos')
    .update({ imagem_url: url })
    .eq('id', eventoId)
  if (dbErr) return { ok: false, erro: 'Não foi possível salvar a imagem.' }

  revalidatePath('/dashboard')
  return { ok: true }
}
