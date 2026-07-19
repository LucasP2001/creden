import { createAdminSupabase } from '@/lib/supabase'
import { cpfValido, telefoneValido, emailValido } from '@/lib/mascaras'
import { Evento } from '@/types'

export type ResultadoValidacao =
  | { ok: false; erro: string }
  | {
      ok: true
      nome: string
      email: string
      dadosExtras: Record<string, string>
      cpfLabel: string | null
      cpfDigitos: string
    }

/** Valida os dados de uma inscrição contra o evento. Pura (sem I/O). */
export function validarDadosInscricao(evento: Evento, formData: FormData): ResultadoValidacao {
  const nome = String(formData.get('nome') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!nome || !email) return { ok: false, erro: 'Preencha nome e e-mail.' }
  if (!emailValido(email)) return { ok: false, erro: 'E-mail inválido.' }

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
  return { ok: true, nome, email, dadosExtras, cpfLabel, cpfDigitos }
}

/** Checa duplicado (e-mail/CPF) e vagas restantes. Lê inscricoes existentes. */
export async function checarDuplicadoEVagas(
  admin: ReturnType<typeof createAdminSupabase>,
  evento: Evento,
  email: string,
  cpfLabel: string | null,
  cpfDigitos: string
): Promise<{ ok: boolean; erro?: string }> {
  if (evento.vagas_max != null) {
    const { count } = await admin
      .from('inscricoes')
      .select('id', { count: 'exact', head: true })
      .eq('evento_id', evento.id)
      .neq('status', 'cancelado')
    if ((count ?? 0) >= evento.vagas_max) {
      return { ok: false, erro: 'As vagas para este evento se esgotaram.' }
    }
  }

  const { data: existentes } = await admin
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
  return { ok: true }
}
