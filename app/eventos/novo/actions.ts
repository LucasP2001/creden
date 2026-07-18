'use server'

import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase'
import { slugify } from '@/lib/slug'
import { uploadCapa } from '@/lib/capa'
import { corCapaValida } from '@/lib/imagem'
import { parseDias } from '@/lib/sessoes'
import { datetimeLocalBrParaIso } from '@/lib/datas'
import { lerPeriodo, sanitizarCampos } from '@/app/eventos/[id]/editar/payload'
import { CampoExtra } from '@/types'

export interface CriarEventoResult {
  ok: boolean
  erro?: string
}

/**
 * Cria um evento do organizador logado. RLS exige auth.uid() = user_id.
 * Garante slug único acrescentando sufixo numérico se necessário.
 * Em sucesso, redireciona para o dashboard.
 */
export async function criarEvento(formData: FormData): Promise<CriarEventoResult> {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, erro: 'Você precisa estar logado para criar um evento.' }

  const nome = String(formData.get('nome') ?? '').trim()
  const dataHora = String(formData.get('data_hora') ?? '')
  if (!nome) return { ok: false, erro: 'Informe o nome do evento.' }
  if (!dataHora) return { ok: false, erro: 'Informe a data e hora do evento.' }

  const periodo = lerPeriodo(formData)
  if (periodo.erro) return { ok: false, erro: periodo.erro }

  const vagasRaw = String(formData.get('vagas_max') ?? '')
  const valorRaw = String(formData.get('valor') ?? '0')
  const camposJson = String(formData.get('campos_extras') ?? '[]')

  let camposExtras: CampoExtra[] = []
  try {
    camposExtras = sanitizarCampos(JSON.parse(camposJson))
  } catch {
    camposExtras = []
  }

  const base = slugify(nome) || 'evento'
  const slug = await slugUnico(supabase, base)

  const { data: novo, error } = await supabase
    .from('eventos')
    .insert({
      user_id: user.id,
      nome,
      descricao: String(formData.get('descricao') ?? '') || null,
      data_hora: datetimeLocalBrParaIso(dataHora)!,
      local: String(formData.get('local') ?? '') || null,
      vagas_max: vagasRaw ? Number(vagasRaw) : null,
      valor: valorRaw ? Math.round(Number(valorRaw) * 100) : 0, // reais -> centavos
      slug,
      campos_extras: camposExtras,
      dias: parseDias(String(formData.get('dias') ?? '[]')),
      cor_capa: corCapaValida(String(formData.get('cor_capa') ?? '')),
      inscricoes_abrem_em: periodo.abre,
      inscricoes_fecham_em: periodo.fecha,
    })
    .select('id')
    .single()

  if (error || !novo) {
    return { ok: false, erro: 'Não foi possível publicar o evento. Tente novamente.' }
  }

  // Upload da capa (opcional). Falha aqui não bloqueia a publicação.
  const url = await uploadCapa(supabase, user.id, novo.id, formData.get('capa'))
  if (url) {
    await supabase.from('eventos').update({ imagem_url: url }).eq('id', novo.id)
  }

  redirect('/dashboard')
}

// Acrescenta -2, -3, ... até achar um slug livre.
async function slugUnico(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  base: string
): Promise<string> {
  let candidato = base
  for (let i = 2; i < 50; i++) {
    const { data } = await supabase.from('eventos').select('id').eq('slug', candidato).maybeSingle()
    if (!data) return candidato
    candidato = `${base}-${i}`
  }
  // fallback improvável: sufixo aleatório curto baseado no tempo
  return `${base}-${Math.floor(Date.now() % 100000)}`
}
