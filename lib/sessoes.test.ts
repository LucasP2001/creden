import { describe, it, expect } from 'vitest'
import { novaSessao, rotuloTipo, parseSessoes, agruparPorDia } from './sessoes'
import { idsDeSessoes } from './marcacoes'
import type { Sessao } from '@/types'

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

describe('parseSessoes', () => {
  it('parseia array válido', () => {
    const arr = parseSessoes(JSON.stringify([s({ titulo: 'A' })]))
    expect(arr).toHaveLength(1)
    expect(arr[0].titulo).toBe('A')
  })
  it('retorna [] em JSON inválido', () => {
    expect(parseSessoes('{{')).toEqual([])
    expect(parseSessoes('')).toEqual([])
  })
  it('retorna [] se não for array', () => {
    expect(parseSessoes('{"a":1}')).toEqual([])
  })
})

describe('idsDeSessoes', () => {
  it('extrai os ids', () => {
    expect(idsDeSessoes([s({ id: 'a' }), s({ id: 'b' })])).toEqual(['a', 'b'])
    expect(idsDeSessoes([])).toEqual([])
  })
})

describe('agruparPorDia', () => {
  it('agrupa por dia e ordena dias e horários', () => {
    const grupos = agruparPorDia([
      s({ dia: '2026-08-11', hora_inicio: '10:00', titulo: 'B' }),
      s({ dia: '2026-08-10', hora_inicio: '14:00', titulo: 'C' }),
      s({ dia: '2026-08-10', hora_inicio: '08:00', titulo: 'A' }),
    ])
    expect(grupos.map((g) => g.dia)).toEqual(['2026-08-10', '2026-08-11'])
    expect(grupos[0].itens.map((i) => i.titulo)).toEqual(['A', 'C'])
    expect(grupos[1].itens.map((i) => i.titulo)).toEqual(['B'])
  })
})
