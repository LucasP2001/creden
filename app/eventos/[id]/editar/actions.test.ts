import { describe, it, expect } from 'vitest'
import { montarPayloadUpdate, sanitizarCampos } from './payload'
import { CampoExtra } from '@/types'

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

  it('dias: JSON válido é parseado; ausente vira []', () => {
    const base = { nome: 'X', data_hora: '2026-08-01T14:00', campos_extras: '[]' }
    const dias = [{ id: 'd1', data: '2026-08-10', sessoes: [], categorias: [] }]
    expect(
      montarPayloadUpdate(fd({ ...base, dias: JSON.stringify(dias) })).payload.dias
    ).toEqual(dias)
    expect(montarPayloadUpdate(fd(base)).payload.dias).toEqual([])
  })

  it('período de inscrição: datas viram ISO; vazio vira null (sem limite)', () => {
    const base = { nome: 'X', data_hora: '2026-08-01T14:00', campos_extras: '[]' }
    const { payload } = montarPayloadUpdate(
      fd({ ...base, inscricoes_abrem_em: '2026-07-01T09:00', inscricoes_fecham_em: '2026-08-09T23:59' })
    )
    expect(payload.inscricoes_abrem_em).toBe(new Date('2026-07-01T09:00').toISOString())
    expect(payload.inscricoes_fecham_em).toBe(new Date('2026-08-09T23:59').toISOString())

    const vazio = montarPayloadUpdate(fd({ ...base, inscricoes_abrem_em: '', inscricoes_fecham_em: '' }))
    expect(vazio.payload.inscricoes_abrem_em).toBeNull()
    expect(vazio.payload.inscricoes_fecham_em).toBeNull()

    const ausente = montarPayloadUpdate(fd(base))
    expect(ausente.payload.inscricoes_abrem_em).toBeNull()
    expect(ausente.payload.inscricoes_fecham_em).toBeNull()
  })

  it('período incoerente (fecha antes de abrir) é recusado', () => {
    const base = { nome: 'X', data_hora: '2026-08-01T14:00', campos_extras: '[]' }
    const { erro } = montarPayloadUpdate(
      fd({ ...base, inscricoes_abrem_em: '2026-08-09T23:59', inscricoes_fecham_em: '2026-07-01T09:00' })
    )
    expect(erro).toBeTruthy()
  })

  it('data de inscrição inválida é recusada', () => {
    const base = { nome: 'X', data_hora: '2026-08-01T14:00', campos_extras: '[]' }
    expect(montarPayloadUpdate(fd({ ...base, inscricoes_abrem_em: 'xxx' })).erro).toBeTruthy()
  })
})

describe('sanitizarCampos', () => {
  const campo = (over: Partial<CampoExtra>): CampoExtra => ({
    id: 'c1',
    label: 'Instituição',
    tipo: 'texto',
    obrigatorio: false,
    ...over,
  })

  it('descarta campos sem label (linha em branco)', () => {
    const out = sanitizarCampos([campo({ label: '   ' }), campo({ id: 'c2', label: 'Curso' })])
    expect(out).toHaveLength(1)
    expect(out[0].label).toBe('Curso')
  })

  it('trima label e opções, removendo opções vazias', () => {
    const out = sanitizarCampos([
      campo({ tipo: 'opcoes', label: '  Turno  ', opcoes: [' Manhã ', '', '  ', 'Noite'] }),
    ])
    expect(out[0].label).toBe('Turno')
    expect(out[0].opcoes).toEqual(['Manhã', 'Noite'])
  })

  it('opcoes sem nenhuma opção válida vira texto', () => {
    const out = sanitizarCampos([campo({ tipo: 'opcoes', label: 'X', opcoes: ['', '  '] })])
    expect(out[0].tipo).toBe('texto')
    expect(out[0].opcoes).toBeUndefined()
  })

  it('preserva obrigatorio e limpa opcoes de campos texto/numero', () => {
    const out = sanitizarCampos([
      campo({ tipo: 'numero', label: 'Idade', obrigatorio: true, opcoes: ['lixo'] }),
    ])
    expect(out[0].obrigatorio).toBe(true)
    expect(out[0].opcoes).toBeUndefined()
  })

  it('entrada não-array vira []', () => {
    // @ts-expect-error validando robustez em runtime
    expect(sanitizarCampos(null)).toEqual([])
  })
})
