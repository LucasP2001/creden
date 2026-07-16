import { describe, it, expect } from 'vitest'
import { novaSessao, rotuloTipo, parseCategorias, novaCategoria, todasSessoes } from './sessoes'
import { idsDeSessoes } from './marcacoes'
import type { Sessao, Categoria } from '@/types'

function s(over: Partial<Sessao>): Sessao {
  return {
    id: over.id ?? crypto.randomUUID(),
    dia: over.dia ?? '2026-08-10',
    hora_inicio: over.hora_inicio ?? '08:00',
    hora_fim: over.hora_fim ?? '09:00',
    titulo: over.titulo ?? 'X',
    tipo: over.tipo ?? 'palestra',
    tipo_outro: over.tipo_outro ?? null,
    palestrante: over.palestrante ?? null,
    local: over.local ?? null,
    vagas_max: over.vagas_max ?? null,
  }
}

describe('novaSessao', () => {
  it('gera id único e defaults vazios', () => {
    const a = novaSessao()
    const b = novaSessao()
    expect(a.id).not.toBe(b.id)
    expect(a.tipo).toBe('palestra')
    expect(a.tipo_outro).toBeNull()
    expect(a.vagas_max).toBeNull()
  })
})

describe('rotuloTipo', () => {
  it('usa rótulo padrão por tipo', () => {
    expect(rotuloTipo({ tipo: 'palestra', tipo_outro: null })).toBe('Palestra')
    expect(rotuloTipo({ tipo: 'minicurso', tipo_outro: null })).toBe('Minicurso')
    expect(rotuloTipo({ tipo: 'servico', tipo_outro: null })).toBe('Serviço')
  })
  it('usa tipo_outro quando tipo é outro e há texto', () => {
    expect(rotuloTipo({ tipo: 'outro', tipo_outro: 'Mesa redonda' })).toBe('Mesa redonda')
  })
  it('cai em "Atividade" quando outro sem texto', () => {
    expect(rotuloTipo({ tipo: 'outro', tipo_outro: null })).toBe('Atividade')
  })
})

describe('idsDeSessoes', () => {
  it('extrai os ids', () => {
    const cats: Categoria[] = [{ id: 'c1', titulo: 'A', sessoes: [s({ id: 'a' }), s({ id: 'b' })] }]
    expect(idsDeSessoes(cats)).toEqual(['a', 'b'])
    expect(idsDeSessoes([])).toEqual([])
  })
})

describe('novaCategoria', () => {
  it('gera id único e título vazio com sessoes []', () => {
    const a = novaCategoria()
    const b = novaCategoria()
    expect(a.id).not.toBe(b.id)
    expect(a.titulo).toBe('')
    expect(a.sessoes).toEqual([])
  })
})

describe('parseCategorias', () => {
  it('parseia array válido', () => {
    const arr = parseCategorias(JSON.stringify([{ id: 'c1', titulo: 'Dia 1', sessoes: [] }]))
    expect(arr).toHaveLength(1)
    expect(arr[0].titulo).toBe('Dia 1')
  })
  it('retorna [] em JSON inválido/não-array', () => {
    expect(parseCategorias('{{')).toEqual([])
    expect(parseCategorias('')).toEqual([])
    expect(parseCategorias('{"a":1}')).toEqual([])
  })
})

describe('todasSessoes', () => {
  it('achata as sessões de todas as categorias', () => {
    const cats: Categoria[] = [
      { id: 'c1', titulo: 'A', sessoes: [s({ id: 's1' }), s({ id: 's2' })] },
      { id: 'c2', titulo: 'B', sessoes: [s({ id: 's3' })] },
    ]
    expect(todasSessoes(cats).map((x) => x.id)).toEqual(['s1', 's2', 's3'])
    expect(todasSessoes([])).toEqual([])
  })
})
