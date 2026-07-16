import { describe, it, expect } from 'vitest'
import { montarPayloadUpdate } from './payload'

function fd(campos: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(campos)) f.set(k, v)
  return f
}

describe('montarPayloadUpdate', () => {
  it('converte valor de reais para centavos e normaliza campos', () => {
    const { payload, erro } = montarPayloadUpdate(
      fd({ nome: 'Novo', data_hora: '2026-08-01T14:00', local: 'Sala 1', vagas_max: '30', valor: '99.90', descricao: 'oi', campos_extras: '[]' })
    )
    expect(erro).toBeUndefined()
    expect(payload.nome).toBe('Novo')
    expect(payload.valor).toBe(9990)
    expect(payload.vagas_max).toBe(30)
    expect(payload.local).toBe('Sala 1')
    expect(payload.descricao).toBe('oi')
    expect(payload.campos_extras).toEqual([])
    expect(payload).not.toHaveProperty('slug')
  })

  it('vazios viram null; grátis vira 0', () => {
    const { payload } = montarPayloadUpdate(
      fd({ nome: 'X', data_hora: '2026-08-01T14:00', local: '', vagas_max: '', valor: '0', descricao: '', campos_extras: '[]' })
    )
    expect(payload.local).toBeNull()
    expect(payload.vagas_max).toBeNull()
    expect(payload.descricao).toBeNull()
    expect(payload.valor).toBe(0)
  })

  it('erro quando nome ou data ausente', () => {
    expect(montarPayloadUpdate(fd({ nome: '', data_hora: '2026-08-01T14:00' })).erro).toBeTruthy()
    expect(montarPayloadUpdate(fd({ nome: 'X', data_hora: '' })).erro).toBeTruthy()
  })

  it('cor_capa: preset válido passa; ausente/inválida vira branco', () => {
    const base = { nome: 'X', data_hora: '2026-08-01T14:00', campos_extras: '[]' }
    expect(montarPayloadUpdate(fd({ ...base, cor_capa: '#0E5C56' })).payload.cor_capa).toBe('#0E5C56')
    expect(montarPayloadUpdate(fd({ ...base, cor_capa: '#abcabc' })).payload.cor_capa).toBe('#FFFFFF')
    expect(montarPayloadUpdate(fd(base)).payload.cor_capa).toBe('#FFFFFF')
  })
})
