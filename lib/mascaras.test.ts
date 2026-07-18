import { describe, it, expect } from 'vitest'
import {
  apenasDigitos,
  formatarCpf,
  formatarTelefone,
  cpfValido,
  telefoneValido,
  emailValido,
} from './mascaras'

describe('apenasDigitos', () => {
  it('remove tudo que não é dígito', () => {
    expect(apenasDigitos('(92) 99123-4567')).toBe('92991234567')
    expect(apenasDigitos('abc')).toBe('')
  })
})

describe('formatarCpf', () => {
  it('formata progressivamente', () => {
    expect(formatarCpf('529')).toBe('529')
    expect(formatarCpf('5299')).toBe('529.9')
    expect(formatarCpf('52998224725')).toBe('529.982.247-25')
  })
  it('ignora não-dígitos e corta em 11', () => {
    expect(formatarCpf('529.982.247-25999')).toBe('529.982.247-25')
  })
})

describe('formatarTelefone', () => {
  it('celular (11) vira (00) 00000-0000', () => {
    expect(formatarTelefone('92991234567')).toBe('(92) 99123-4567')
  })
  it('fixo (10) vira (00) 0000-0000', () => {
    expect(formatarTelefone('9232334567')).toBe('(92) 3233-4567')
  })
  it('parcial mantém DDD entre parênteses', () => {
    expect(formatarTelefone('9')).toBe('(9')
    expect(formatarTelefone('92')).toBe('(92')
    expect(formatarTelefone('929')).toBe('(92) 9')
  })
})

describe('cpfValido', () => {
  it('aceita CPF com dígitos verificadores corretos', () => {
    expect(cpfValido('529.982.247-25')).toBe(true)
  })
  it('rejeita DV errado, tamanho errado e todos iguais', () => {
    expect(cpfValido('529.982.247-24')).toBe(false)
    expect(cpfValido('123')).toBe(false)
    expect(cpfValido('111.111.111-11')).toBe(false)
  })
})

describe('telefoneValido', () => {
  it('aceita 10 ou 11 dígitos', () => {
    expect(telefoneValido('(92) 3233-4567')).toBe(true)
    expect(telefoneValido('(92) 99123-4567')).toBe(true)
  })
  it('rejeita tamanhos fora disso', () => {
    expect(telefoneValido('9232')).toBe(false)
    expect(telefoneValido('929912345678')).toBe(false)
  })
})

describe('emailValido', () => {
  it('aceita e-mail com @ e domínio', () => {
    expect(emailValido('lucas@sasi.com.br')).toBe(true)
    expect(emailValido(' lucas@sasi.com ')).toBe(true) // trima
  })
  it('rejeita sem @, sem domínio ou com espaço', () => {
    expect(emailValido('lucaspinheiro.tapaua2mail')).toBe(false) // caso do print
    expect(emailValido('lucas@sasi')).toBe(false)
    expect(emailValido('lucas @sasi.com')).toBe(false)
    expect(emailValido('')).toBe(false)
  })
})
