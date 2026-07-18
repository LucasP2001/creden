import { CampoExtra, Dia } from '@/types'
import { corCapaValida } from '@/lib/imagem'
import { parseDias } from '@/lib/sessoes'
import { comCamposFixos } from '@/lib/campos'
import { datetimeLocalParaIso } from '@/lib/datas'
import { fusoValido } from '@/lib/fuso'

/**
 * Limpa os campos vindos do form, preservando a ordem:
 *  - nome/e-mail (fixos) passam intactos, normalizados para o valor canônico;
 *  - descarta campos extras sem label (linha em branco não preenchida);
 *  - em campos "opcoes", trima e remove opções vazias, e rebaixa para "texto"
 *    se não sobrar nenhuma (um select sem opção não serviria a ninguém).
 * Ao fim garante que nome e e-mail existam (comCamposFixos), sem duplicá-los.
 */
export function sanitizarCampos(brutos: CampoExtra[]): CampoExtra[] {
  if (!Array.isArray(brutos)) return []
  const limpos = brutos
    .filter((c) => c.fixo || String(c.label ?? '').trim().length > 0)
    .map((c) => {
      if (c.fixo) return c // normalização acontece em comCamposFixos
      const label = String(c.label ?? '').trim()
      if (c.tipo === 'opcoes') {
        const opcoes = (c.opcoes ?? []).map((o) => String(o).trim()).filter(Boolean)
        return opcoes.length
          ? { ...c, label, opcoes }
          : { ...c, label, tipo: 'texto' as const, opcoes: undefined }
      }
      return { ...c, label, opcoes: undefined }
    })
  return comCamposFixos(limpos)
}

export interface PayloadUpdate {
  nome: string
  descricao: string | null
  data_hora: string
  fuso: string
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
  formData: FormData,
  fuso: string = 'America/Sao_Paulo'
): { abre: string | null; fecha: string | null; erro?: string } {
  const bruto = (k: string) => String(formData.get(k) ?? '').trim()

  function parse(valor: string, rotulo: string): { iso: string | null; erro?: string } {
    if (!valor) return { iso: null }
    const iso = datetimeLocalParaIso(valor, fuso)
    if (!iso) return { iso: null, erro: `Data de ${rotulo} inválida.` }
    return { iso }
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
  const fuso = fusoValido(formData.get('fuso') as string | null)
  if (!nome) return { payload: {} as PayloadUpdate, erro: 'Informe o nome do evento.' }
  if (!dataHora) return { payload: {} as PayloadUpdate, erro: 'Informe a data e hora do evento.' }

  const periodo = lerPeriodo(formData, fuso)
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
      data_hora: datetimeLocalParaIso(dataHora, fuso)!,
      fuso,
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
