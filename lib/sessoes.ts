import type { Sessao, TipoSessao, Categoria } from '@/types'

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
    dia: '',
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

/** Nova categoria vazia para o form. */
export function novaCategoria(): Categoria {
  return { id: crypto.randomUUID(), titulo: '', sessoes: [] }
}

/** Parseia o jsonb de categorias vindo do FormData; [] em qualquer erro. */
export function parseCategorias(json: string): Categoria[] {
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? (v as Categoria[]) : []
  } catch {
    return []
  }
}

/** Achata todas as sessões de todas as categorias (ordem do array). */
export function todasSessoes(categorias: Categoria[]): Sessao[] {
  return categorias.flatMap((c) => c.sessoes ?? [])
}
