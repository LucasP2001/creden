import type { Sessao, TipoSessao } from '@/types'

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

/** Rótulo de exibição do tipo (usa tipo_outro quando tipo === 'outro'). */
export function rotuloTipo(s: Pick<Sessao, 'tipo' | 'tipo_outro'>): string {
  if (s.tipo === 'outro' && s.tipo_outro && s.tipo_outro.trim()) return s.tipo_outro.trim()
  return ROTULOS[s.tipo]
}

/** Parseia o jsonb de sessões vindo do FormData; [] em qualquer erro. */
export function parseSessoes(json: string): Sessao[] {
  try {
    const v = JSON.parse(json)
    return Array.isArray(v) ? (v as Sessao[]) : []
  } catch {
    return []
  }
}

/** Agrupa por dia (asc) com itens ordenados por hora_inicio (asc). */
export function agruparPorDia(sessoes: Sessao[]): { dia: string; itens: Sessao[] }[] {
  const mapa = new Map<string, Sessao[]>()
  for (const s of sessoes) {
    const arr = mapa.get(s.dia) ?? []
    arr.push(s)
    mapa.set(s.dia, arr)
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, itens]) => ({
      dia,
      itens: [...itens].sort((x, y) => x.hora_inicio.localeCompare(y.hora_inicio)),
    }))
}
