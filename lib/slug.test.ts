import { describe, it, expect } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
  it('minúsculas e troca espaços por hífen', () => {
    expect(slugify('Workshop de Cerâmica')).toBe('workshop-de-ceramica')
  })

  it('remove acentos', () => {
    expect(slugify('Inscrição Válida')).toBe('inscricao-valida')
  })

  it('colapsa não-alfanuméricos em um único hífen', () => {
    expect(slugify('A -- B__C!!D')).toBe('a-b-c-d')
  })

  it('remove hífens das pontas', () => {
    expect(slugify('  -Olá-  ')).toBe('ola')
  })

  it('string sem caractere válido vira vazio', () => {
    expect(slugify('!!!')).toBe('')
  })
})
