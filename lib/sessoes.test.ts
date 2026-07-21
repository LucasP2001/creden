import { describe, it, expect } from 'vitest'
import { novaSessao, rotuloTipo, parseDias, novaCategoria, novoDia, todasSessoes, sessoesDoEvento } from './sessoes'
import { idsDeSessoes } from './marcacoes'
import type { Sessao, Dia } from '@/types'

function s(over: Partial<Sessao>): Sessao {
  return {
    id: over.id ?? crypto.randomUUID(),
    hora_inicio: over.hora_inicio ?? '08:00',
    hora_fim: over.hora_fim ?? '09:00',
    titulo: over.titulo ?? 'X',
    tipo: over.tipo ?? 'palestra',
    tipo_outro: over.tipo_outro ?? null,
    palestrante: over.palestrante ?? null,
    local: over.local ?? null,
    vagas_max: over.vagas_max ?? null,
    sem_inscricao: over.sem_inscricao ?? false,
  }
}

// Um dia com sessões soltas e/ou categorias.
function d(over: Partial<Dia>): Dia {
  return {
    id: over.id ?? crypto.randomUUID(),
    data: over.data ?? '2026-08-10',
    sessoes: over.sessoes ?? [],
    categorias: over.categorias ?? [],
  }
}

describe('novaSessao', () => {
  it('gera id único e defaults vazios (sem dia)', () => {
    const a = novaSessao()
    const b = novaSessao()
    expect(a.id).not.toBe(b.id)
    expect(a.tipo).toBe('palestra')
    expect(a.tipo_outro).toBeNull()
    expect(a.vagas_max).toBeNull()
    expect('dia' in a).toBe(false)
  })
})

describe('novoDia', () => {
  it('gera id único, data vazia, sessoes e categorias []', () => {
    const a = novoDia()
    const b = novoDia()
    expect(a.id).not.toBe(b.id)
    expect(a.data).toBe('')
    expect(a.sessoes).toEqual([])
    expect(a.categorias).toEqual([])
  })
})

describe('novaCategoria', () => {
  it('gera id único e título vazio com sessoes []', () => {
    const a = novaCategoria()
    expect(a.titulo).toBe('')
    expect(a.sessoes).toEqual([])
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

describe('parseDias', () => {
  it('parseia array válido', () => {
    const arr = parseDias(JSON.stringify([{ id: 'd1', data: '2026-08-10', sessoes: [], categorias: [] }]))
    expect(arr).toHaveLength(1)
    expect(arr[0].data).toBe('2026-08-10')
  })
  it('retorna [] em JSON inválido/não-array', () => {
    expect(parseDias('{{')).toEqual([])
    expect(parseDias('')).toEqual([])
    expect(parseDias('{"a":1}')).toEqual([])
  })
})

describe('todasSessoes', () => {
  it('achata sessões soltas e de categorias, na ordem dia -> soltas -> categorias', () => {
    const dias: Dia[] = [
      d({
        sessoes: [s({ id: 'solta1' })],
        categorias: [{ id: 'c1', titulo: 'A', sessoes: [s({ id: 'c1s1' }), s({ id: 'c1s2' })] }],
      }),
      d({ sessoes: [s({ id: 'solta2' })], categorias: [] }),
    ]
    expect(todasSessoes(dias).map((x) => x.id)).toEqual(['solta1', 'c1s1', 'c1s2', 'solta2'])
    expect(todasSessoes([])).toEqual([])
  })
})

describe('idsDeSessoes', () => {
  it('extrai ids de todas as sessões do cronograma', () => {
    const dias: Dia[] = [
      d({ sessoes: [s({ id: 'a' })], categorias: [{ id: 'c1', titulo: 'A', sessoes: [s({ id: 'b' })] }] }),
    ]
    expect(idsDeSessoes(dias)).toEqual(['a', 'b'])
    expect(idsDeSessoes([])).toEqual([])
  })
})

describe('sessoesDoEvento', () => {
  it('achata sessões soltas e de categorias na ordem do cronograma', () => {
    const dias: Dia[] = [
      {
        id: 'd1',
        data: '2026-07-21',
        sessoes: [s({ id: 's1', titulo: 'Abertura' })],
        categorias: [
          { id: 'c1', titulo: 'Manhã', sessoes: [s({ id: 's2', titulo: 'Workshop A' })] },
        ],
      },
    ]
    expect(sessoesDoEvento(dias)).toEqual([
      { id: 's1', titulo: 'Abertura', data: '2026-07-21' },
      { id: 's2', titulo: 'Workshop A', data: '2026-07-21' },
    ])
  })

  it('ignora sessões com sem_inscricao', () => {
    const dias: Dia[] = [
      {
        id: 'd1',
        data: '2026-07-21',
        sessoes: [
          s({ id: 's1', titulo: 'Abertura' }),
          s({ id: 'pausa', titulo: 'Café', sem_inscricao: true }),
        ],
        categorias: [],
      },
    ]
    expect(sessoesDoEvento(dias).map((s) => s.id)).toEqual(['s1'])
  })

  it('desambigua título repetido entre dias com a data', () => {
    const dias: Dia[] = [
      { id: 'd1', data: '2026-07-21', sessoes: [s({ id: 's1', titulo: 'Abertura' })], categorias: [] },
      { id: 'd2', data: '2026-07-22', sessoes: [s({ id: 's2', titulo: 'Abertura' })], categorias: [] },
    ]
    expect(sessoesDoEvento(dias).map((s) => s.titulo)).toEqual([
      'Abertura (21/07)',
      'Abertura (22/07)',
    ])
  })

  it('não desambigua quando o título é único', () => {
    const dias: Dia[] = [
      { id: 'd1', data: '2026-07-21', sessoes: [s({ id: 's1', titulo: 'Abertura' })], categorias: [] },
    ]
    expect(sessoesDoEvento(dias)[0].titulo).toBe('Abertura')
  })
})
