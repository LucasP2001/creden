import { describe, it, expect } from 'vitest'
import { validarNomeEmail, validarCamposExtras } from './inscricao'
import { Evento, CampoExtra } from '@/types'

function fd(entries: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(entries)) f.append(k, v)
  return f
}

const base = (campos: CampoExtra[]): Evento =>
  ({ id: 'e1', campos_extras: campos } as unknown as Evento)

describe('validarNomeEmail', () => {
  it('reprova nome ou e-mail ausente', () => {
    const r = validarNomeEmail(fd({ nome: '', email: 'a@b.com' }))
    expect(r.ok).toBe(false)
  })

  it('reprova e-mail invalido', () => {
    const r = validarNomeEmail(fd({ nome: 'Ana', email: 'invalido' }))
    expect(r.ok).toBe(false)
  })

  it('normaliza e-mail (trim + lowercase) e nome (trim)', () => {
    const r = validarNomeEmail(fd({ nome: '  Ana  ', email: '  A@B.COM ' }))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.nome).toBe('Ana')
      expect(r.email).toBe('a@b.com')
    }
  })
})

describe('validarCamposExtras', () => {
  it('reprova campo extra obrigatorio vazio', () => {
    const campos: CampoExtra[] = [{ id: 'c1', label: 'Curso', tipo: 'texto', obrigatorio: true }]
    const r = validarCamposExtras(base(campos), fd({}))
    expect(r.ok).toBe(false)
  })

  it('reprova CPF invalido e aprova valido', () => {
    const campos: CampoExtra[] = [{ id: 'c1', label: 'CPF', tipo: 'cpf', obrigatorio: true }]
    const ruim = validarCamposExtras(base(campos), fd({ extra_c1: '111.111.111-11' }))
    expect(ruim.ok).toBe(false)
    const bom = validarCamposExtras(base(campos), fd({ extra_c1: '390.533.447-05' }))
    expect(bom.ok).toBe(true)
    if (bom.ok) {
      expect(bom.cpfLabel).toBe('CPF')
      expect(bom.cpfDigitos).toBe('39053344705')
    }
  })

  it('reprova telefone invalido', () => {
    const campos: CampoExtra[] = [{ id: 'c1', label: 'Telefone', tipo: 'telefone', obrigatorio: false }]
    const r = validarCamposExtras(base(campos), fd({ extra_c1: '123' }))
    expect(r.ok).toBe(false)
  })

  it('coleta dados_extras por label', () => {
    const campos: CampoExtra[] = [{ id: 'c1', label: 'Curso', tipo: 'texto', obrigatorio: false }]
    const r = validarCamposExtras(base(campos), fd({ extra_c1: 'Enfermagem' }))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.dadosExtras).toEqual({ Curso: 'Enfermagem' })
    }
  })

  it('ignora campos fixos', () => {
    const campos: CampoExtra[] = [{ id: 'c1', label: 'Nome', tipo: 'texto', obrigatorio: true, fixo: 'nome' }]
    const r = validarCamposExtras(base(campos), fd({}))
    expect(r.ok).toBe(true)
  })
})
