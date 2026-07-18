/**
 * Período de inscrição do evento. Controla tanto a entrada no evento quanto a
 * escolha de palestras — fora do período, os dois ficam fechados.
 *
 * Ambas as datas são opcionais: sem elas, o evento aceita inscrições sempre
 * (é o comportamento de todo evento criado antes desta funcionalidade).
 */

import { FUSO_BR, formatarHora, rotuloCidadeFuso } from './datas'

export type EstadoInscricao = 'nao_abriu' | 'aberto' | 'encerrado'

/** Data ISO -> Date; null se ausente ou inválida (config quebrada não pode travar a página). */
function parseData(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Em que ponto do período o evento está.
 * Os limites são inclusivos: no instante exato da abertura já se inscreve, e no
 * instante do fechamento ainda dá tempo.
 */
export function estadoInscricao(
  abreEm: string | null | undefined,
  fechaEm: string | null | undefined,
  agora: Date = new Date()
): EstadoInscricao {
  const abre = parseData(abreEm)
  const fecha = parseData(fechaEm)
  const t = agora.getTime()

  // Encerrado tem precedência: com datas invertidas (fecha antes de abrir), o
  // evento não pode acabar "aberto" por acidente de configuração.
  if (fecha && t > fecha.getTime()) return 'encerrado'
  if (abre && t < abre.getTime()) return 'nao_abriu'
  return 'aberto'
}

/** Atalho: dá para se inscrever / mexer nas palestras agora? */
export function inscricoesAbertas(
  abreEm: string | null | undefined,
  fechaEm: string | null | undefined,
  agora: Date = new Date()
): boolean {
  return estadoInscricao(abreEm, fechaEm, agora) === 'aberto'
}

/** '01 de dezembro às 09:00 (Brasília)' — no fuso do evento. */
function formatar(d: Date, fuso: string): string {
  const data = d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    timeZone: fuso,
  })
  return `${data} às ${formatarHora(d.toISOString(), fuso)} (${rotuloCidadeFuso(fuso)})`
}

/**
 * Aviso curto sobre o período, para a página pública. `null` quando não há nada
 * a dizer (sem limite, ou aberto sem data de fim). O `fuso` é o do evento.
 */
export function rotuloPeriodo(
  abreEm: string | null | undefined,
  fechaEm: string | null | undefined,
  agora: Date = new Date(),
  fuso: string = FUSO_BR
): string | null {
  const estado = estadoInscricao(abreEm, fechaEm, agora)
  if (estado === 'encerrado') return 'Inscrições encerradas'

  if (estado === 'nao_abriu') {
    const abre = parseData(abreEm)
    return abre ? `Inscrições abrem em ${formatar(abre, fuso)}` : null
  }

  const fecha = parseData(fechaEm)
  return fecha ? `Inscrições até ${formatar(fecha, fuso)}` : null
}
