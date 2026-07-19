import { describe, it, expect } from 'vitest'
import { resolverAcesso } from './acesso'

describe('resolverAcesso', () => {
  it('dono pode ver e editar', () => {
    expect(resolverAcesso(true, null)).toEqual({
      ehDono: true, papel: null, podeVer: true, podeEditar: true,
    })
  })
  it('editor (não dono) pode ver e editar', () => {
    const a = resolverAcesso(false, 'editor')
    expect(a.podeVer).toBe(true)
    expect(a.podeEditar).toBe(true)
    expect(a.ehDono).toBe(false)
  })
  it('checkin pode ver, não pode editar', () => {
    const a = resolverAcesso(false, 'checkin')
    expect(a.podeVer).toBe(true)
    expect(a.podeEditar).toBe(false)
  })
  it('sem papel e não dono: nada', () => {
    const a = resolverAcesso(false, null)
    expect(a.podeVer).toBe(false)
    expect(a.podeEditar).toBe(false)
  })
})
