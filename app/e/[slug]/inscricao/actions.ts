'use server'

import { createAdminSupabase } from '@/lib/supabase'
import { gerarToken } from '@/lib/qr'
import { enviarIngresso } from '@/lib/email'
import { gravarMarcacoes } from '@/lib/marcacoes'
import { Evento } from '@/types'

export interface InscreverResult {
  ok: boolean
  erro?: string
  aviso?: string
}

/** Parseia o jsonb de ids marcados vindo do FormData; [] em qualquer erro. */
function parseIds(json: string): string[] {
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

/**
 * Cria uma inscrição pública num evento e envia o ingresso por e-mail.
 * Roda no servidor com service_role (createAdminSupabase) para poder:
 *  - validar vagas restantes de forma confiável
 *  - gerar o token e gravar
 * O insert anônimo também é permitido pela RLS (política "insert público"),
 * mas a validação de vagas exige leitura agregada — por isso admin aqui.
 */
export async function inscrever(slug: string, formData: FormData): Promise<InscreverResult> {
  const supabase = createAdminSupabase()

  const { data: eventoRow } = await supabase
    .from('eventos')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!eventoRow) return { ok: false, erro: 'Evento não encontrado.' }
  const evento = eventoRow as Evento

  const nome = String(formData.get('nome') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!nome || !email) return { ok: false, erro: 'Preencha nome e e-mail.' }

  // Valida vagas restantes, se houver limite.
  if (evento.vagas_max != null) {
    const { count } = await supabase
      .from('inscricoes')
      .select('id', { count: 'exact', head: true })
      .eq('evento_id', evento.id)
      .neq('status', 'cancelado')
    if ((count ?? 0) >= evento.vagas_max) {
      return { ok: false, erro: 'As vagas para este evento se esgotaram.' }
    }
  }

  // Coleta respostas dos campos extras (name="extra_<id>").
  const dadosExtras: Record<string, string> = {}
  for (const campo of evento.campos_extras ?? []) {
    const v = formData.get(`extra_${campo.id}`)
    if (v != null) dadosExtras[campo.label] = String(v)
  }

  const token = gerarToken()

  const { data: inscricaoRow, error } = await supabase
    .from('inscricoes')
    .insert({
      evento_id: evento.id,
      nome,
      email,
      dados_extras: dadosExtras,
      status: 'inscrito',
      token,
    })
    .select('id')
    .single()

  if (error || !inscricaoRow) {
    return { ok: false, erro: 'Não foi possível concluir sua inscrição. Tente novamente.' }
  }

  const marcados = parseIds(String(formData.get('sessoes_marcadas') ?? '[]'))
  const rejeitadas = await gravarMarcacoes(supabase, evento.id, inscricaoRow.id, marcados, evento.categorias)

  // Envia o ingresso. Se o e-mail falhar, a inscrição já existe — não bloqueia o sucesso,
  // mas registra o erro (o participante ainda pode acessar /i/[token]).
  try {
    await enviarIngresso({
      para: email,
      nomeParticipante: nome,
      nomeEvento: evento.nome,
      dataEvento: new Date(evento.data_hora).toLocaleString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      local: evento.local ?? '',
      token,
    })
  } catch (e) {
    console.error('Falha ao enviar ingresso por e-mail:', e)
  }

  if (rejeitadas.length > 0) {
    return { ok: true, aviso: `Estas sessões já estavam lotadas: ${rejeitadas.join(', ')}.` }
  }

  return { ok: true }
}
