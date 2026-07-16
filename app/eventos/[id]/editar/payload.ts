import { CampoExtra } from '@/types'
import { corCapaValida } from '@/lib/imagem'

export interface PayloadUpdate {
  nome: string
  descricao: string | null
  data_hora: string
  local: string | null
  vagas_max: number | null
  valor: number
  campos_extras: CampoExtra[]
  cor_capa: string
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

  const vagasRaw = String(formData.get('vagas_max') ?? '')
  const valorRaw = String(formData.get('valor') ?? '0')
  const camposJson = String(formData.get('campos_extras') ?? '[]')
  let camposExtras: CampoExtra[] = []
  try {
    camposExtras = JSON.parse(camposJson)
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
      cor_capa: corCapaValida(String(formData.get('cor_capa') ?? '')),
    },
  }
}
