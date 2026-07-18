'use server'

import { createAdminSupabase } from '@/lib/supabase'
import { gerarToken } from '@/lib/qr'
import { enviarIngresso } from '@/lib/email'
import { estadoInscricao } from '@/lib/periodo'
import { formatarDataHora } from '@/lib/datas'
import { cpfValido, telefoneValido } from '@/lib/mascaras'
import { Evento } from '@/types'

export interface InscreverResult {
  ok: boolean
  erro?: string
  /** Token da inscrição criada — o form redireciona para /i/[token]. */
  token?: string
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

  // Janela de inscrição. Checada aqui, no servidor: a UI esconde o botão, mas
  // quem chamar a action direto também precisa ser barrado.
  const estado = estadoInscricao(evento.inscricoes_abrem_em, evento.inscricoes_fecham_em)
  if (estado === 'nao_abriu') {
    return { ok: false, erro: 'As inscrições para este evento ainda não abriram.' }
  }
  if (estado === 'encerrado') {
    return { ok: false, erro: 'As inscrições para este evento estão encerradas.' }
  }

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

  // Coleta respostas dos campos extras (name="extra_<id>"). Nome e e-mail são
  // fixos (lidos acima) e não entram em dados_extras. Valida no servidor: o
  // cliente já barra, mas quem chamar a action direto tem que ser barrado também.
  const dadosExtras: Record<string, string> = {}
  let cpfLabel: string | null = null
  let cpfDigitos = ''
  for (const campo of evento.campos_extras ?? []) {
    if (campo.fixo) continue
    const valor = String(formData.get(`extra_${campo.id}`) ?? '').trim()
    if (valor) dadosExtras[campo.label] = valor

    if (campo.obrigatorio && !valor) {
      return { ok: false, erro: `Preencha o campo "${campo.label}".` }
    }
    if (campo.tipo === 'cpf' && valor) {
      if (!cpfValido(valor)) return { ok: false, erro: `CPF inválido em "${campo.label}".` }
      cpfLabel = campo.label
      cpfDigitos = valor.replace(/\D/g, '')
    }
    if (campo.tipo === 'telefone' && valor && !telefoneValido(valor)) {
      return { ok: false, erro: `Telefone inválido em "${campo.label}".` }
    }
  }

  // Não permite inscrição duplicada no mesmo evento (mesmo e-mail ou mesmo CPF).
  // Inscrições canceladas não contam — a pessoa pode se inscrever de novo.
  const { data: existentes } = await supabase
    .from('inscricoes')
    .select('email, dados_extras')
    .eq('evento_id', evento.id)
    .neq('status', 'cancelado')

  for (const insc of (existentes ?? []) as { email: string; dados_extras: Record<string, string> | null }[]) {
    if (insc.email?.toLowerCase() === email) {
      return { ok: false, erro: 'Este e-mail já está inscrito neste evento.' }
    }
    if (cpfLabel && cpfDigitos) {
      const cpfExistente = String(insc.dados_extras?.[cpfLabel] ?? '').replace(/\D/g, '')
      if (cpfExistente && cpfExistente === cpfDigitos) {
        return { ok: false, erro: 'Este CPF já está inscrito neste evento.' }
      }
    }
  }

  const token = gerarToken()

  const { error } = await supabase.from('inscricoes').insert({
    evento_id: evento.id,
    nome,
    email,
    dados_extras: dadosExtras,
    status: 'inscrito',
    token,
  })

  if (error) {
    return { ok: false, erro: 'Não foi possível concluir sua inscrição. Tente novamente.' }
  }

  // As sessões (palestras/minicursos) o participante escolhe depois, na página dele
  // (/i/[token]) — não no formulário de inscrição.

  // Envia o ingresso. Se o e-mail falhar, a inscrição já existe — não bloqueia o sucesso,
  // mas registra o erro (o participante ainda pode acessar /i/[token]).
  try {
    await enviarIngresso({
      para: email,
      nomeParticipante: nome,
      nomeEvento: evento.nome,
      dataEvento: formatarDataHora(evento.data_hora),
      local: evento.local ?? '',
      token,
    })
  } catch (e) {
    console.error('Falha ao enviar ingresso por e-mail:', e)
  }

  return { ok: true, token }
}
