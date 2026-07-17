import { CampoExtra, Dia } from '@/types'
import { corCapaValida } from '@/lib/imagem'
import { parseDias } from '@/lib/sessoes'

/**
 * Limpa os campos extras vindos do form:
 *  - descarta campos sem label (linha em branco que o organizador não preencheu);
 *  - em campos "opcoes", trima e remove opções vazias, e rebaixa para "texto"
 *    se sobrar nenhuma (um select sem opção não serviria a ninguém).
 */
export function sanitizarCampos(brutos: CampoExtra[]): CampoExtra[] {
  if (!Array.isArray(brutos)) return []
  return brutos
    .map((c) => {
      const label = String(c.label ?? '').trim()
      if (c.tipo === 'opcoes') {
        const opcoes = (c.opcoes ?? []).map((o) => String(o).trim()).filter(Boolean)
        return opcoes.length
          ? { ...c, label, opcoes }
          : { ...c, label, tipo: 'texto' as const, opcoes: undefined }
      }
      return { ...c, label, opcoes: undefined }
    })
    .filter((c) => c.label.length > 0)
}

export interface PayloadUpdate {
  nome: string
  descricao: string | null
  data_hora: string
  local: string | null
  vagas_max: number | null
  valor: number
  campos_extras: CampoExtra[]
  dias: Dia[]
  cor_capa: string
  inscricoes_abrem_em: string | null
  inscricoes_fecham_em: string | null
}

/**
 * Janela de inscrição vinda do form (dois `datetime-local`). Vazio = sem limite.
 * Config incoerente é recusada aqui, e não tratada depois: um evento com
 * fechamento antes da abertura nunca aceitaria ninguém.
 */
export function lerPeriodo(
  formData: FormData
): { abre: string | null; fecha: string | null; erro?: string } {
  const bruto = (k: string) => String(formData.get(k) ?? '').trim()

  function parse(valor: string, rotulo: string): { iso: string | null; erro?: string } {
    if (!valor) return { iso: null }
    const d = new Date(valor)
    if (Number.isNaN(d.getTime())) return { iso: null, erro: `Data de ${rotulo} inválida.` }
    return { iso: d.toISOString() }
  }

  const a = parse(bruto('inscricoes_abrem_em'), 'abertura das inscrições')
  if (a.erro) return { abre: null, fecha: null, erro: a.erro }
  const f = parse(bruto('inscricoes_fecham_em'), 'encerramento das inscrições')
  if (f.erro) return { abre: null, fecha: null, erro: f.erro }

  if (a.iso && f.iso && new Date(f.iso) <= new Date(a.iso)) {
    return {
      abre: null,
      fecha: null,
      erro: 'O encerramento das inscrições deve ser depois da abertura.',
    }
  }
  return { abre: a.iso, fecha: f.iso }
}

/**
 * Monta o payload de update a partir do FormData. Puro (sem I/O) para ser
 * testável. NÃO inclui slug — o link público não muda ao editar.
 *
 * Vive fora de actions.ts porque um módulo 'use server' só pode exportar
 * async functions (Server Actions) — uma função pura síncrona não pode
 * conviver ali.
 */
export function montarPayloadUpdate(
  formData: FormData
): { payload: PayloadUpdate; erro?: string } {
  const nome = String(formData.get('nome') ?? '').trim()
  const dataHora = String(formData.get('data_hora') ?? '')
  if (!nome) return { payload: {} as PayloadUpdate, erro: 'Informe o nome do evento.' }
  if (!dataHora) return { payload: {} as PayloadUpdate, erro: 'Informe a data e hora do evento.' }

  const periodo = lerPeriodo(formData)
  if (periodo.erro) return { payload: {} as PayloadUpdate, erro: periodo.erro }

  const vagasRaw = String(formData.get('vagas_max') ?? '')
  const valorRaw = String(formData.get('valor') ?? '0')
  const camposJson = String(formData.get('campos_extras') ?? '[]')
  let camposExtras: CampoExtra[] = []
  try {
    camposExtras = sanitizarCampos(JSON.parse(camposJson))
  } catch {
    camposExtras = []
  }

  return {
    payload: {
      nome,
      descricao: String(formData.get('descricao') ?? '') || null,
      data_hora: new Date(dataHora).toISOString(),
      local: String(formData.get('local') ?? '') || null,
      vagas_max: vagasRaw ? Number(vagasRaw) : null,
      valor: valorRaw ? Math.round(Number(valorRaw) * 100) : 0,
      campos_extras: camposExtras,
      dias: parseDias(String(formData.get('dias') ?? '[]')),
      cor_capa: corCapaValida(String(formData.get('cor_capa') ?? '')),
      inscricoes_abrem_em: periodo.abre,
      inscricoes_fecham_em: periodo.fecha,
    },
  }
}
