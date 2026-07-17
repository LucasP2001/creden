import { describe, it, expect } from 'vitest'
import { estadoInscricao, inscricoesAbertas, rotuloPeriodo } from './periodo'

const T = (iso: string) => new Date(iso)

// Evento com período 01/07 09:00 → 09/08 23:59
const ABRE = '2026-07-01T09:00:00-03:00'
const FECHA = '2026-08-09T23:59:00-03:00'

describe('estadoInscricao', () => {
  it('sem datas, está sempre aberto', () => {
    expect(estadoInscricao(null, null, T('2020-01-01T00:00:00Z'))).toBe('aberto')
    expect(estadoInscricao(null, null, T('2099-01-01T00:00:00Z'))).toBe('aberto')
  })

  it('antes da abertura, ainda não abriu', () => {
    expect(estadoInscricao(ABRE, FECHA, T('2026-06-30T23:59:00-03:00'))).toBe('nao_abriu')
  })

  it('no instante da abertura, já abriu', () => {
    expect(estadoInscricao(ABRE, FECHA, T(ABRE))).toBe('aberto')
  })

  it('dentro do período, aberto', () => {
    expect(estadoInscricao(ABRE, FECHA, T('2026-07-15T12:00:00-03:00'))).toBe('aberto')
  })

  it('no instante do fechamento, ainda aberto', () => {
    expect(estadoInscricao(ABRE, FECHA, T(FECHA))).toBe('aberto')
  })

  it('um segundo depois do fechamento, encerrado', () => {
    expect(estadoInscricao(ABRE, FECHA, T('2026-08-09T23:59:01-03:00'))).toBe('encerrado')
  })

  it('só abertura definida: fecha nunca', () => {
    expect(estadoInscricao(ABRE, null, T('2026-06-30T00:00:00-03:00'))).toBe('nao_abriu')
    expect(estadoInscricao(ABRE, null, T('2099-01-01T00:00:00Z'))).toBe('aberto')
  })

  it('só fechamento definido: abre desde sempre', () => {
    expect(estadoInscricao(null, FECHA, T('2020-01-01T00:00:00Z'))).toBe('aberto')
    expect(estadoInscricao(null, FECHA, T('2026-08-10T00:00:00-03:00'))).toBe('encerrado')
  })

  it('datas invertidas (fecha antes de abrir): trata como encerrado depois do fecha', () => {
    // Config incoerente do organizador não pode "abrir" o evento por acidente.
    expect(estadoInscricao(FECHA, ABRE, T('2026-09-01T00:00:00-03:00'))).toBe('encerrado')
  })

  it('string inválida é ignorada, como se não houvesse limite', () => {
    expect(estadoInscricao('nao-e-data', null, T('2026-07-15T12:00:00-03:00'))).toBe('aberto')
    expect(estadoInscricao(null, 'nao-e-data', T('2026-07-15T12:00:00-03:00'))).toBe('aberto')
  })
})

describe('inscricoesAbertas', () => {
  it('true só quando o estado é aberto', () => {
    expect(inscricoesAbertas(ABRE, FECHA, T('2026-07-15T12:00:00-03:00'))).toBe(true)
    expect(inscricoesAbertas(ABRE, FECHA, T('2026-06-01T12:00:00-03:00'))).toBe(false)
    expect(inscricoesAbertas(ABRE, FECHA, T('2026-09-01T12:00:00-03:00'))).toBe(false)
  })
})

describe('rotuloPeriodo', () => {
  it('sem datas, não há aviso', () => {
    expect(rotuloPeriodo(null, null, T('2026-07-15T12:00:00-03:00'))).toBeNull()
  })

  it('aberto com data de fim avisa até quando', () => {
    const r = rotuloPeriodo(ABRE, FECHA, T('2026-07-15T12:00:00-03:00'))
    expect(r).toMatch(/^Inscrições até /)
  })

  it('aberto sem data de fim não avisa', () => {
    expect(rotuloPeriodo(ABRE, null, T('2026-07-15T12:00:00-03:00'))).toBeNull()
  })

  it('antes de abrir, diz quando abre', () => {
    const r = rotuloPeriodo(ABRE, FECHA, T('2026-06-01T12:00:00-03:00'))
    expect(r).toMatch(/^Inscrições abrem em /)
  })

  it('encerrado diz encerrado', () => {
    expect(rotuloPeriodo(ABRE, FECHA, T('2026-09-01T12:00:00-03:00'))).toBe(
      'Inscrições encerradas'
    )
  })
})
