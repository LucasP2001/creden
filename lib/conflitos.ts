import type { Dia, Sessao } from '@/types'

/** Duração assumida quando a sessão não declara hora_fim. */
const DURACAO_PADRAO_MIN = 60

/** 'HH:MM' -> minutos desde 00:00. null se não for um horário válido. */
function minutos(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm ?? '')
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/** Janela [inicio, fim) em minutos. null quando a sessão não tem hora utilizável. */
function janela(s: Sessao): { inicio: number; fim: number } | null {
  const inicio = minutos(s.hora_inicio)
  if (inicio == null) return null
  const fimDeclarado = minutos(s.hora_fim)
  // hora_fim ausente ou anterior ao início (ex.: vira o dia) não é confiável para
  // comparar dentro de um mesmo dia — cai na duração padrão.
  const fim = fimDeclarado != null && fimDeclarado > inicio ? fimDeclarado : inicio + DURACAO_PADRAO_MIN
  return { inicio, fim }
}

/** Todas as sessões de um dia (soltas + de categorias), ordenadas por hora de início. */
export function sessoesDoDia(dia: Dia): Sessao[] {
  const todas = [
    ...(dia.sessoes ?? []),
    ...(dia.categorias ?? []).flatMap((c) => c.sessoes ?? []),
  ]
  return todas.slice().sort((a, b) => (minutos(a.hora_inicio) ?? 0) - (minutos(b.hora_inicio) ?? 0))
}

/**
 * Ids das sessões marcadas que se sobrepõem no tempo com outra marcada do mesmo dia.
 * Intervalos (`sem_inscricao`) nunca conflitam. Sessões sem horário são ignoradas.
 */
export function sessoesEmConflito(dias: Dia[], marcadas: string[]): Set<string> {
  const conflito = new Set<string>()
  const marcadasSet = new Set(marcadas)

  for (const dia of dias ?? []) {
    const janelas = sessoesDoDia(dia)
      .filter((s) => marcadasSet.has(s.id) && !s.sem_inscricao)
      .map((s) => ({ id: s.id, j: janela(s) }))
      .filter((x): x is { id: string; j: { inicio: number; fim: number } } => x.j != null)

    for (let i = 0; i < janelas.length; i++) {
      for (let k = i + 1; k < janelas.length; k++) {
        const a = janelas[i].j
        const b = janelas[k].j
        if (a.inicio < b.fim && b.inicio < a.fim) {
          conflito.add(janelas[i].id)
          conflito.add(janelas[k].id)
        }
      }
    }
  }
  return conflito
}

/**
 * Formata 'YYYY-MM-DD' como 'seg, 10/08'. String vazia devolve ''.
 *
 * Aqui NÃO se fixa timeZone (ao contrário de lib/datas): a entrada é uma data
 * pura, sem hora, e `T00:00:00` sem Z já é meia-noite local. Formatar isso em
 * America/Sao_Paulo num servidor UTC devolveria o dia anterior (21:00 de 09/08).
 * Sem timeZone, a data volta como foi escrita — que é o que o organizador quis.
 */
export function formatarDiaLongo(iso: string): string {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  const semana = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  const dia = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${semana}, ${dia}`
}
