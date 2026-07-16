import { describe, it, expect } from 'vitest'
import { capaPath, capaUrlComBust } from './capa'

describe('capaPath', () => {
  it('monta {userId}/{eventoId}.{ext} a partir do mime', () => {
    expect(capaPath('u1', 'e1', 'image/png')).toBe('u1/e1.png')
    expect(capaPath('u1', 'e1', 'image/webp')).toBe('u1/e1.webp')
    expect(capaPath('u1', 'e1', 'image/jpeg')).toBe('u1/e1.jpg')
  })
})

describe('capaUrlComBust', () => {
  it('acrescenta ?v=timestamp', () => {
    expect(capaUrlComBust('https://x/eventos-capas/u1/e1.png', 123)).toBe(
      'https://x/eventos-capas/u1/e1.png?v=123'
    )
  })
})
