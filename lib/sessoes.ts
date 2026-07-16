import type { Sessao, TipoSessao, Categoria, Dia } from '@/types'

const ROTULOS: Record<TipoSessao, string> = {
  palestra: 'Palestra',
  minicurso: 'Minicurso',
  servico: 'Serviço',
  outro: 'Atividade',
}

/** Nova sessão vazia para o form do organizador. */
export function novaSessao(): Sessao {
  return {
    id: crypto.randomUUID(),
    hora_inicio: '',
    hora_fim: '',
    titulo: '',
    tipo: 'palestra',
    tipo_outro: null,
    palestrante: null,
    local: null,
    vagas_max: null,
  }
}

/** Nova categoria vazia (grupo de sessões dentro de um dia). */
export function novaCategoria(): Categoria {
  return { id: crypto.randomUUID(), titulo: '', sessoes: [] }
}

/** Novo dia vazio para o form. */
export function novoDia(): Dia {
  return { id: crypto.randomUUID(), data: '', sessoes: [], categorias: [] }
}

/** Formata 'YYYY-MM-DD' como 'dd/mm' (pt-BR). Assume iso não-vazio. */
export function formatarDia(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

/** Rótulo de exibição do tipo (usa tipo_outro quando tipo === 'outro'). */
export function rotuloTipo(s: Pick<Sessao, 'tipo' | 'tipo_outro'>): string {
  if (s.tipo === 'outro' && s.tipo_outro && s.tipo_outro.trim()) return s.tipo_outro.trim()
  return ROTULOS[s.tipo]
}

/** Parseia o jsonb de dias vindo do FormData; [] em qualquer erro. */
export function parseDias(json: string): Dia[] {
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? (v as Dia[]) : []
  } catch {
    return []
  }
}

/**
 * Achata todas as sessões do cronograma: por dia, as sessões soltas (`sessoes`)
 * mais as de cada categoria (`categorias[].sessoes`). Usado para contagem/vaga.
 */
export function todasSessoes(dias: Dia[]): Sessao[] {
  return (dias ?? []).flatMap((d) => [
    ...(d.sessoes ?? []),
    ...(d.categorias ?? []).flatMap((c) => c.sessoes ?? []),
  ])
}
