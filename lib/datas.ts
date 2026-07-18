/**
 * Formatação de datas do Creden.
 *
 * Tudo aqui fixa o fuso em America/Sao_Paulo. Sem isso, a formatação segue o
 * fuso da máquina: a Vercel roda em UTC e mostraria "12:00" onde o organizador
 * marcou 09:00; um dev em Manaus (UTC-4) veria "08:00". O público é o Brasil,
 * então o horário de Brasília é a referência única.
 *
 * Se um dia o evento precisar do próprio fuso (evento no Acre, por exemplo),
 * é aqui que o parâmetro entra — e não espalhado por 16 chamadas de toLocale*.
 */

/** Fuso de referência do produto. Exportado para formatações pontuais. */
export const FUSO_BR = 'America/Sao_Paulo'
const FUSO = FUSO_BR
const LOCALE = 'pt-BR'

/** '01 de dez. de 2026, 09:00' — data e hora padrão do app. */
export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString(LOCALE, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: FUSO,
  })
}

/** 'terça-feira, 01 de dezembro de 2026 · 09:00' — cabeçalho da página do evento. */
export function formatarDataLonga(iso: string): string {
  const d = new Date(iso)
  const data = d.toLocaleDateString(LOCALE, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: FUSO,
  })
  return `${data} · ${formatarHora(iso)}`
}

/** '09:00' */
export function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: FUSO,
  })
}

/** '01/12' */
export function formatarDiaMes(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    timeZone: FUSO,
  })
}

/** '01/12/2026 09:00' — usado no CSV de inscritos. */
export function formatarDataHoraCurta(iso: string): string {
  return new Date(iso).toLocaleString(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: FUSO,
  })
}

/**
 * Descobre o offset (em minutos) do fuso BR numa data — positivo a oeste de UTC.
 * Ex.: horário de Brasília sem verão = 180 (UTC-3). Calcula pela diferença entre
 * a mesma instância formatada em UTC e no fuso, então acompanha verão histórico.
 */
function offsetBrMinutos(d: Date): number {
  const emFuso = new Date(d.toLocaleString('en-US', { timeZone: FUSO }))
  const emUtc = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }))
  return Math.round((emUtc.getTime() - emFuso.getTime()) / 60000)
}

/**
 * Converte um valor de <input type="datetime-local"> ('YYYY-MM-DDTHH:mm', sem
 * fuso) para ISO UTC, interpretando a hora como horário de Brasília.
 *
 * Sem isto, `new Date(valor)` interpreta a hora no fuso do servidor (a Vercel
 * roda em UTC): o organizador marca 14:00 e o banco grava 14:00Z, que a página
 * exibe como 11:00. Aqui 14:00 de parede vira o instante UTC correto (17:00Z).
 * Retorna null para entrada vazia/ inválida.
 */
export function datetimeLocalBrParaIso(valor: string): string | null {
  if (!valor) return null
  // Interpreta como UTC primeiro (determinístico), depois aplica o offset do fuso.
  const comoUtc = new Date(`${valor}:00Z`)
  if (Number.isNaN(comoUtc.getTime())) return null
  const off = offsetBrMinutos(comoUtc)
  return new Date(comoUtc.getTime() + off * 60000).toISOString()
}

/**
 * Inverso de datetimeLocalBrParaIso: ISO UTC -> 'YYYY-MM-DDTHH:mm' na hora de
 * Brasília, para preencher o <input datetime-local> ao editar. Usa o fuso BR
 * fixo (não o da máquina do organizador).
 */
export function isoParaDatetimeLocalBr(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: FUSO,
  }).formatToParts(d)
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? ''
  return `${g('year')}-${g('month')}-${g('day')}T${g('hour')}:${g('minute')}`
}

/** Dia da semana abreviado + dia/mês: 'ter, 01/12'. */
export function formatarDiaSemanaCurto(isoData: string): string {
  const d = new Date(isoData)
  if (Number.isNaN(d.getTime())) return ''
  const semana = d.toLocaleDateString(LOCALE, { weekday: 'short', timeZone: FUSO }).replace('.', '')
  const dia = d.toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit', timeZone: FUSO })
  return `${semana}, ${dia}`
}
