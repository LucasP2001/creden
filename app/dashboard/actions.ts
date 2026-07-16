'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabase } from '@/lib/supabase'
import { validarImagem, extensaoImagem } from '@/lib/imagem'

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
  const invalido = validarImagem(capa)
  if (invalido) return { ok: false, erro: invalido }

  const ext = extensaoImagem(capa.type)
  const path = `${user.id}/${eventoId}.${ext}`
  const { error: upErr } = await supabase.storage
    .from('eventos-capas')
    .upload(path, capa, { upsert: true, contentType: capa.type })
  if (upErr) return { ok: false, erro: 'Não foi possível enviar a imagem.' }

  const { data: pub } = supabase.storage.from('eventos-capas').getPublicUrl(path)
  const urlComBust = `${pub.publicUrl}?v=${Date.now()}`
  const { error: dbErr } = await supabase
    .from('eventos')
    .update({ imagem_url: urlComBust })
    .eq('id', eventoId)
  if (dbErr) return { ok: false, erro: 'Não foi possível salvar a imagem.' }

  revalidatePath('/dashboard')
  return { ok: true }
}
