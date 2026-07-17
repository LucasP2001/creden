import { describe, it, expect } from 'vitest'
import { diasSelecionaveis, contarSelecionaveis } from './abas'
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

function d(over: Partial<Dia>): Dia {
  return {
    id: over.id ?? crypto.randomUUID(),
    data: over.data ?? '2026-08-10',
    sessoes: over.sessoes ?? [],
    categorias: over.categorias ?? [],
  }
}

describe('diasSelecionaveis', () => {
  it('remove intervalo entre duas marcáveis — aqui a lista é só para decidir', () => {
    const dias = [
      d({
        sessoes: [
          s({ id: 'a', hora_inicio: '13:30' }),
          s({ id: 'p', hora_inicio: '14:30', sem_inscricao: true }),
          s({ id: 'b', hora_inicio: '15:00' }),
        ],
      }),
    ]
    const r = diasSelecionaveis(dias)
    expect(r[0].sessoes.map((x) => x.id)).toEqual(['a', 'b'])
  })

  it('remove intervalo no começo do dia', () => {
    const dias = [
      d({
        sessoes: [
          s({ id: 'cred', hora_inicio: '13:00', sem_inscricao: true }),
          s({ id: 'a', hora_inicio: '13:30' }),
        ],
      }),
    ]
    const r = diasSelecionaveis(dias)
    expect(r[0].sessoes.map((x) => x.id)).toEqual(['a'])
  })

  it('remove intervalo no fim do dia', () => {
    const dias = [
      d({
        sessoes: [
          s({ id: 'a', hora_inicio: '13:30' }),
          s({ id: 'fim', hora_inicio: '18:00', sem_inscricao: true }),
        ],
      }),
    ]
    const r = diasSelecionaveis(dias)
    expect(r[0].sessoes.map((x) => x.id)).toEqual(['a'])
  })

  it('remove intervalos seguidos', () => {
    const dias = [
      d({
        sessoes: [
          s({ id: 'a', hora_inicio: '13:30' }),
          s({ id: 'p1', hora_inicio: '14:30', sem_inscricao: true }),
          s({ id: 'p2', hora_inicio: '14:45', sem_inscricao: true }),
          s({ id: 'b', hora_inicio: '15:00' }),
        ],
      }),
    ]
    const r = diasSelecionaveis(dias)
    expect(r[0].sessoes.map((x) => x.id)).toEqual(['a', 'b'])
  })

  it('dia só com intervalos some por completo', () => {
    const dias = [
      d({
        id: 'd1',
        sessoes: [
          s({ id: 'p1', sem_inscricao: true }),
          s({ id: 'p2', sem_inscricao: true }),
        ],
      }),
    ]
    expect(diasSelecionaveis(dias)).toEqual([])
  })

  it('dia sem nenhuma marcável, mas com categoria, some', () => {
    const dias = [
      d({
        categorias: [
          { id: 'c', titulo: 'C', sessoes: [s({ id: 'p', sem_inscricao: true })] },
        ],
      }),
    ]
    expect(diasSelecionaveis(dias)).toEqual([])
  })

  it('preserva categorias com marcáveis e descarta as sem', () => {
    const dias = [
      d({
        categorias: [
          { id: 'c1', titulo: 'Com', sessoes: [s({ id: 'a' })] },
          { id: 'c2', titulo: 'Sem', sessoes: [s({ id: 'p', sem_inscricao: true })] },
        ],
      }),
    ]
    const r = diasSelecionaveis(dias)
    expect(r[0].categorias.map((c) => c.id)).toEqual(['c1'])
  })

  it('intervalo dentro de uma categoria também sai', () => {
    const dias = [
      d({
        categorias: [
          {
            id: 'c1',
            titulo: 'C',
            sessoes: [
              s({ id: 'a', hora_inicio: '08:00' }),
              s({ id: 'p', hora_inicio: '09:30', sem_inscricao: true }),
              s({ id: 'b', hora_inicio: '10:00' }),
            ],
          },
        ],
      }),
    ]
    const r = diasSelecionaveis(dias)
    expect(r[0].categorias[0].sessoes.map((x) => x.id)).toEqual(['a', 'b'])
  })

  it('não muta os dias originais', () => {
    const dias = [
      d({
        sessoes: [
          s({ id: 'cred', sem_inscricao: true }),
          s({ id: 'a' }),
        ],
      }),
    ]
    diasSelecionaveis(dias)
    expect(dias[0].sessoes.map((x) => x.id)).toEqual(['cred', 'a'])
  })

  it('tolera dias nulo e arrays ausentes', () => {
    expect(diasSelecionaveis(null as unknown as Dia[])).toEqual([])
    const meio = { id: 'd', data: '', sessoes: undefined, categorias: undefined } as unknown as Dia
    expect(diasSelecionaveis([meio])).toEqual([])
  })
})

describe('contarSelecionaveis', () => {
  it('conta só as marcáveis, em soltas e categorias', () => {
    const dias = [
      d({
        sessoes: [s({ id: 'a' }), s({ id: 'p', sem_inscricao: true })],
        categorias: [{ id: 'c', titulo: 'C', sessoes: [s({ id: 'b' })] }],
      }),
    ]
    expect(contarSelecionaveis(dias)).toBe(2)
  })

  it('zero quando não há marcáveis', () => {
    expect(contarSelecionaveis([d({ sessoes: [s({ sem_inscricao: true })] })])).toBe(0)
  })
})
