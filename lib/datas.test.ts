import { describe, it, expect } from 'vitest'
import { formatarDataHora, formatarHora, formatarDiaMes, formatarDataLonga } from './datas'

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
})
