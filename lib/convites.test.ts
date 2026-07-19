import { describe, it, expect } from 'vitest'
import { convitesParaReivindicar } from './convites'

describe('convitesParaReivindicar', () => {
  it('retorna ids de convites sem user_id', () => {
    const linhas = [
      { id: 'a', user_id: null },
      { id: 'b', user_id: 'outro' },
      { id: 'c', user_id: null },
    ]
    expect(convitesParaReivindicar(linhas)).toEqual(['a', 'c'])
  })
  it('lista vazia', () => {
    expect(convitesParaReivindicar([])).toEqual([])
  })
})
