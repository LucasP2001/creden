import type { Categoria, Dia, Sessao } from '@/types'
import { todasSessoes } from '@/lib/sessoes'

/**
 * Mantém os intervalos que separam duas marcáveis e descarta o resto.
 * Na aba Inscrição o intervalo existe só para dar noção de tempo entre as
 * escolhas — pausa no começo/fim da lista não separa nada, e uma sequência de
 * pausas vira uma só.
 */
function intervalosEntreMarcaveis(sessoes: Sessao[]): Sessao[] {
  const saida: Sessao[] = []
  let viuMarcavel = false
  let intervaloPendente: Sessao | null = null

  for (const s of sessoes) {
    if (s.sem_inscricao) {
      // Só o primeiro intervalo do bloco interessa, e apenas depois de uma marcável.
      if (viuMarcavel && intervaloPendente == null) intervaloPendente = s
      continue
    }
    // Marcável: o intervalo pendente de fato separa duas — entra agora.
    if (intervaloPendente != null) {
      saida.push(intervaloPendente)
      intervaloPendente = null
    }
    saida.push(s)
    viuMarcavel = true
  }
  // intervaloPendente que sobrou está no fim da lista: descartado.
  return saida
}

/** Só as categorias que têm ao menos uma sessão marcável, já filtradas. */
function categoriasSelecionaveis(categorias: Categoria[]): Categoria[] {
  return (categorias ?? [])
    .map((c) => ({ ...c, sessoes: intervalosEntreMarcaveis(c.sessoes ?? []) }))
    .filter((c) => c.sessoes.some((s) => !s.sem_inscricao))
}

/**
 * Cronograma reduzido ao que o participante pode escolher (aba Inscrição).
 * Mantém os intervalos que separam marcáveis para preservar a noção de tempo;
 * dias sem nenhuma marcável somem. Não muta a entrada.
 */
export function diasSelecionaveis(dias: Dia[]): Dia[] {
  return (dias ?? [])
    .map((d) => ({
      ...d,
      sessoes: intervalosEntreMarcaveis(d.sessoes ?? []),
      categorias: categoriasSelecionaveis(d.categorias ?? []),
    }))
    .filter(
      (d) =>
        d.sessoes.some((s) => !s.sem_inscricao) ||
        d.categorias.some((c) => c.sessoes.some((s) => !s.sem_inscricao))
    )
}

/** Quantas sessões o participante pode marcar no cronograma inteiro. */
export function contarSelecionaveis(dias: Dia[]): number {
  return todasSessoes(dias).filter((s) => !s.sem_inscricao).length
}
