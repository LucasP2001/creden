import { extensaoImagem, validarImagem } from '@/lib/imagem'
import type { createServerSupabase } from '@/lib/supabase'

const BUCKET = 'eventos-capas'

/** Path do objeto no Storage: {userId}/{eventoId}.{ext}. Puro. */
export function capaPath(userId: string, eventoId: string, mimeType: string): string {
  return `${userId}/${eventoId}.${extensaoImagem(mimeType)}`
}

/** URL pública + cache-bust para forçar refresh de CDN/navegador. Puro. */
export function capaUrlComBust(publicUrl: string, agora: number = Date.now()): string {
  return `${publicUrl}?v=${agora}`
}

/**
 * Faz upload da capa (upsert) e retorna a URL pública com cache-bust.
 * Retorna null se não houver arquivo válido ou se o upload falhar
 * (capa é opcional — o chamador decide o que fazer com null).
 */
export async function uploadCapa(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  userId: string,
  eventoId: string,
  capa: FormDataEntryValue | null
): Promise<string | null> {
  if (!(capa instanceof File) || capa.size === 0) return null
  if (validarImagem(capa)) return null

  const path = capaPath(userId, eventoId, capa.type)
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, capa, { upsert: true, contentType: capa.type })
  if (upErr) return null

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return capaUrlComBust(pub.publicUrl)
}
