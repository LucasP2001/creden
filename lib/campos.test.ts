import { describe, it, expect } from 'vitest'
import { comCamposFixos, mover, CAMPO_NOME, CAMPO_EMAIL } from './campos'
import { CampoExtra } from '@/types'

const extra = (id: string, label: string): CampoExtra => ({
  id,
  label,
  tipo: 'texto',
  obrigatorio: false,
})

describe('comCamposFixos', () => {
  it('injeta nome e e-mail no topo quando faltam', () => {
    const out = comCamposFixos([extra('c1', 'Instituição')])
    expect(out.map((c) => c.id)).toEqual(['nome', 'email', 'c1'])
  })

  it('preserva a ordem quando os fixos já estão na lista', () => {
    const out = comCamposFixos([extra('c1', 'Curso'), CAMPO_EMAIL, CAMPO_NOME])
    expect(out.map((c) => c.id)).toEqual(['c1', 'email', 'nome'])
  })

  it('não duplica fixos e normaliza label/tipo adulterados', () => {
    const adulterado: CampoExtra = {
      id: 'nome',
      label: 'HACK',
      tipo: 'opcoes',
      obrigatorio: false,
      fixo: 'nome',
    }
    const out = comCamposFixos([adulterado])
    const nome = out.find((c) => c.id === 'nome')!
    expect(out.filter((c) => c.id === 'nome')).toHaveLength(1)
    expect(nome.label).toBe(CAMPO_NOME.label)
    expect(nome.tipo).toBe('texto')
    expect(nome.obrigatorio).toBe(true)
  })

  it('entrada vazia vira só os dois fixos', () => {
    expect(comCamposFixos([]).map((c) => c.id)).toEqual(['nome', 'email'])
  })
})

describe('mover', () => {
  it('sobe e desce', () => {
    expect(mover(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c'])
    expect(mover(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b'])
  })
  it('nas bordas não faz nada', () => {
    expect(mover(['a', 'b'], 0, -1)).toEqual(['a', 'b'])
    expect(mover(['a', 'b'], 1, 1)).toEqual(['a', 'b'])
  })
})
