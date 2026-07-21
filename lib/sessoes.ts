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
    sem_inscricao: false,
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

/**
 * Formata 'YYYY-MM-DD' como 'dd/mm' (pt-BR). Assume iso não-vazio.
 *
 * Sem timeZone de propósito (ao contrário de lib/datas): a entrada é data pura e
 * `T00:00:00` sem Z já é meia-noite local — fixar o fuso devolveria o dia
 * anterior num servidor UTC.
 */
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

export interface SessaoAchatada {
  id: string
  titulo: string
  data: string // 'YYYY-MM-DD'
}

/** dd/MM a partir de 'YYYY-MM-DD' (sem timezone — string pura). */
function diaMes(data: string): string {
  const [, mes, dia] = data.split('-')
  return `${dia}/${mes}`
}

/**
 * Achata todas as sessões selecionáveis do cronograma (soltas + de categorias),
 * na ordem em que aparecem. Ignora intervalos (`sem_inscricao`). Quando o mesmo
 * título aparece em mais de um dia, desambigua com a data (ex.: "Abertura (21/07)").
 * Fonte única de ordem e rótulo das sessões — usada pelo filtro e pelo export.
 */
export function sessoesDoEvento(dias: Dia[]): SessaoAchatada[] {
  const bruto: { id: string; titulo: string; data: string }[] = []
  for (const dia of dias ?? []) {
    const todas = [...(dia.sessoes ?? []), ...(dia.categorias ?? []).flatMap((c) => c.sessoes ?? [])]
    for (const s of todas) {
      if (s.sem_inscricao) continue
      bruto.push({ id: s.id, titulo: s.titulo, data: dia.data })
    }
  }

  // Títulos que aparecem em mais de um dia precisam de desambiguação.
  const diasPorTitulo = new Map<string, Set<string>>()
  for (const s of bruto) {
    const set = diasPorTitulo.get(s.titulo) ?? new Set<string>()
    set.add(s.data)
    diasPorTitulo.set(s.titulo, set)
  }

  return bruto.map((s) => ({
    id: s.id,
    data: s.data,
    titulo: (diasPorTitulo.get(s.titulo)?.size ?? 0) > 1 ? `${s.titulo} (${diaMes(s.data)})` : s.titulo,
  }))
}
