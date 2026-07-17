import type { Categoria, Dia, Sessao } from '@/types'
import { todasSessoes } from '@/lib/sessoes'

/** Só as sessões que o participante pode marcar. */
function apenasMarcaveis(sessoes: Sessao[]): Sessao[] {
  return (sessoes ?? []).filter((s) => !s.sem_inscricao)
}

/** Só as categorias que têm ao menos uma sessão marcável, já filtradas. */
function categoriasSelecionaveis(categorias: Categoria[]): Categoria[] {
  return (categorias ?? [])
    .map((c) => ({ ...c, sessoes: apenasMarcaveis(c.sessoes ?? []) }))
    .filter((c) => c.sessoes.length > 0)
}

/**
 * Cronograma reduzido ao que o participante pode escolher (aba Inscrição).
 * Intervalos ficam de fora: aqui a lista é para decidir, e o cronograma completo
 * (com pausas, credenciamento etc.) vive na aba Programação. Dias sem nenhuma
 * marcável somem. Não muta a entrada.
 */
export function diasSelecionaveis(dias: Dia[]): Dia[] {
  return (dias ?? [])
    .map((d) => ({
      ...d,
      sessoes: apenasMarcaveis(d.sessoes ?? []),
      categorias: categoriasSelecionaveis(d.categorias ?? []),
    }))
    .filter((d) => d.sessoes.length > 0 || d.categorias.length > 0)
}

/** Quantas sessões o participante pode marcar no cronograma inteiro. */
export function contarSelecionaveis(dias: Dia[]): number {
  return todasSessoes(dias).filter((s) => !s.sem_inscricao).length
}
