import { describe, it, expect } from 'vitest'
import { validarImagem, extensaoImagem, IMAGEM_TAMANHO_MAX } from './imagem'

describe('validarImagem', () => {
  it('aceita jpeg/png/webp dentro do limite', () => {
    expect(validarImagem({ type: 'image/jpeg', size: 1000 })).toBeNull()
    expect(validarImagem({ type: 'image/png', size: 1000 })).toBeNull()
    expect(validarImagem({ type: 'image/webp', size: 1000 })).toBeNull()
  })

  it('rejeita tipo não suportado', () => {
    expect(validarImagem({ type: 'image/gif', size: 1000 })).toBe(
      'Use uma imagem JPG, PNG ou WEBP.'
    )
  })

  it('rejeita acima do tamanho máximo', () => {
    expect(validarImagem({ type: 'image/png', size: IMAGEM_TAMANHO_MAX + 1 })).toBe(
      'A imagem deve ter no máximo 5 MB.'
    )
  })
})

describe('extensaoImagem', () => {
  it('mapeia mime para extensão', () => {
    expect(extensaoImagem('image/png')).toBe('png')
    expect(extensaoImagem('image/webp')).toBe('webp')
    expect(extensaoImagem('image/jpeg')).toBe('jpg')
  })
})
