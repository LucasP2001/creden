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

/** Dia da semana abreviado + dia/mês: 'ter, 01/12'. */
export function formatarDiaSemanaCurto(isoData: string): string {
  const d = new Date(isoData)
  if (Number.isNaN(d.getTime())) return ''
  const semana = d.toLocaleDateString(LOCALE, { weekday: 'short', timeZone: FUSO }).replace('.', '')
  const dia = d.toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit', timeZone: FUSO })
  return `${semana}, ${dia}`
}
