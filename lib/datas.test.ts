import { describe, it, expect } from 'vitest'
import {
  formatarDataHora,
  formatarHora,
  formatarDiaMes,
  formatarDataLonga,
  datetimeLocalParaIso,
  isoParaDatetimeLocal,
  rotuloCidadeFuso,
} from './datas'

// 01/12/2026 09:00 em Brasília (UTC-3) = 12:00 UTC.
const ISO = '2026-12-01T12:00:00+00:00'

describe('formatação de datas', () => {
  // O servidor da Vercel roda em UTC e o dev daqui em America/Manaus (UTC-4).
  // Sem fuso fixo, o mesmo evento mostraria 12:00, 08:00 ou 09:00 conforme a
  // máquina — por isso tudo formata em America/Sao_Paulo.
  it('formata no fuso de Brasília, não no da máquina', () => {
    expect(formatarDataHora(ISO)).toContain('09:00')
    expect(formatarHora(ISO)).toBe('09:00')
  })

  it('formatarDataHora: dia, mês curto, ano e hora', () => {
    expect(formatarDataHora(ISO)).toBe('01 de dez. de 2026, 09:00')
  })

  it('formatarDataLonga: dia da semana por extenso', () => {
    // 01/12/2026 é uma terça-feira
    expect(formatarDataLonga(ISO)).toMatch(/^terça-feira, 01 de dezembro de 2026 · 09:00$/)
  })

  it('formatarDiaMes: só dia e mês', () => {
    expect(formatarDiaMes(ISO)).toBe('01/12')
  })

  it('data que vira o dia no fuso: 02/12 00:30 UTC ainda é 01/12 em Brasília', () => {
    expect(formatarDataHora('2026-12-02T00:30:00+00:00')).toBe('01 de dez. de 2026, 21:30')
  })

  it('horário de verão não existe mais no Brasil: julho e dezembro são ambos UTC-3', () => {
    expect(formatarHora('2026-07-01T12:00:00+00:00')).toBe('09:00')
    expect(formatarHora('2026-12-01T12:00:00+00:00')).toBe('09:00')
  })

  it('formata no fuso do evento quando informado (Manaus = UTC-4)', () => {
    // Mesmo instante (12:00 UTC): 09:00 em Brasília, 08:00 em Manaus.
    expect(formatarHora(ISO, 'America/Manaus')).toBe('08:00')
    expect(formatarHora(ISO, 'America/Sao_Paulo')).toBe('09:00')
  })
})

describe('conversão datetime-local <-> ISO por fuso', () => {
  it('interpreta a hora de parede no fuso do evento', () => {
    // 08:00 marcado em Brasília (UTC-3) -> 11:00 UTC.
    expect(datetimeLocalParaIso('2026-08-10T08:00', 'America/Sao_Paulo')).toBe(
      '2026-08-10T11:00:00.000Z'
    )
    // 08:00 marcado em Manaus (UTC-4) -> 12:00 UTC.
    expect(datetimeLocalParaIso('2026-08-10T08:00', 'America/Manaus')).toBe(
      '2026-08-10T12:00:00.000Z'
    )
  })

  it('round-trip: ISO -> input -> ISO preserva o instante', () => {
    const iso = '2026-08-10T11:00:00.000Z'
    const local = isoParaDatetimeLocal(iso, 'America/Manaus') // 07:00 em Manaus
    expect(local).toBe('2026-08-10T07:00')
    expect(datetimeLocalParaIso(local, 'America/Manaus')).toBe(iso)
  })

  it('entrada vazia/ inválida -> null / string vazia', () => {
    expect(datetimeLocalParaIso('', 'America/Sao_Paulo')).toBeNull()
    expect(isoParaDatetimeLocal('não-é-data')).toBe('')
  })
})

describe('rotuloCidadeFuso', () => {
  it('São Paulo vira Brasília; outros usam a cidade', () => {
    expect(rotuloCidadeFuso('America/Sao_Paulo')).toBe('Brasília')
    expect(rotuloCidadeFuso('America/Manaus')).toBe('Manaus')
    expect(rotuloCidadeFuso('America/Porto_Velho')).toBe('Porto Velho')
  })

  it('null/ vazio (evento antigo) assume Brasília', () => {
    expect(rotuloCidadeFuso(null)).toBe('Brasília')
    expect(rotuloCidadeFuso('')).toBe('Brasília')
  })
})
