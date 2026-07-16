import { describe, it, expect } from 'vitest'
import { sessoesEmConflito, sessoesDoDia, formatarDiaLongo } from './conflitos'
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

describe('sessoesDoDia', () => {
  it('junta sessões soltas e de categorias, ordenadas por hora', () => {
    const dia = d({
      sessoes: [s({ titulo: 'Solta', hora_inicio: '10:00' })],
      categorias: [
        { id: 'c1', titulo: 'Cat', sessoes: [s({ titulo: 'Cedo', hora_inicio: '08:00' })] },
      ],
    })
    expect(sessoesDoDia(dia).map((x) => x.titulo)).toEqual(['Cedo', 'Solta'])
  })

  it('tolera arrays ausentes', () => {
    const dia = { id: 'd', data: '', sessoes: undefined, categorias: undefined } as unknown as Dia
    expect(sessoesDoDia(dia)).toEqual([])
  })
})

describe('sessoesEmConflito', () => {
  it('retorna vazio quando não há sobreposição', () => {
    const a = s({ id: 'a', hora_inicio: '08:00', hora_fim: '09:00' })
    const b = s({ id: 'b', hora_inicio: '09:00', hora_fim: '10:00' })
    const dias = [d({ sessoes: [a, b] })]
    expect(sessoesEmConflito(dias, ['a', 'b'])).toEqual(new Set())
  })

  it('detecta sobreposição parcial no mesmo dia', () => {
    const a = s({ id: 'a', hora_inicio: '08:00', hora_fim: '09:30' })
    const b = s({ id: 'b', hora_inicio: '09:00', hora_fim: '10:00' })
    const dias = [d({ sessoes: [a, b] })]
    expect(sessoesEmConflito(dias, ['a', 'b'])).toEqual(new Set(['a', 'b']))
  })

  it('detecta sobreposição entre sessão solta e de categoria', () => {
    const a = s({ id: 'a', hora_inicio: '08:00', hora_fim: '10:00' })
    const b = s({ id: 'b', hora_inicio: '09:00', hora_fim: '11:00' })
    const dias = [d({ sessoes: [a], categorias: [{ id: 'c', titulo: 'C', sessoes: [b] }] })]
    expect(sessoesEmConflito(dias, ['a', 'b'])).toEqual(new Set(['a', 'b']))
  })

  it('não acusa conflito entre dias diferentes no mesmo horário', () => {
    const a = s({ id: 'a', hora_inicio: '08:00', hora_fim: '10:00' })
    const b = s({ id: 'b', hora_inicio: '08:00', hora_fim: '10:00' })
    const dias = [d({ data: '2026-08-10', sessoes: [a] }), d({ data: '2026-08-11', sessoes: [b] })]
    expect(sessoesEmConflito(dias, ['a', 'b'])).toEqual(new Set())
  })

  it('ignora sessões não marcadas', () => {
    const a = s({ id: 'a', hora_inicio: '08:00', hora_fim: '10:00' })
    const b = s({ id: 'b', hora_inicio: '09:00', hora_fim: '11:00' })
    const dias = [d({ sessoes: [a, b] })]
    expect(sessoesEmConflito(dias, ['a'])).toEqual(new Set())
  })

  it('ignora intervalos (sem_inscricao) mesmo se marcados', () => {
    const a = s({ id: 'a', hora_inicio: '08:00', hora_fim: '10:00' })
    const pausa = s({ id: 'p', hora_inicio: '09:00', hora_fim: '09:30', sem_inscricao: true })
    const dias = [d({ sessoes: [a, pausa] })]
    expect(sessoesEmConflito(dias, ['a', 'p'])).toEqual(new Set())
  })

  it('sem hora_fim, assume 1h de duração', () => {
    const a = s({ id: 'a', hora_inicio: '08:00', hora_fim: '' })
    const b = s({ id: 'b', hora_inicio: '08:30', hora_fim: '' })
    const dias = [d({ sessoes: [a, b] })]
    expect(sessoesEmConflito(dias, ['a', 'b'])).toEqual(new Set(['a', 'b']))
  })

  it('ignora sessão sem hora_inicio', () => {
    const a = s({ id: 'a', hora_inicio: '', hora_fim: '' })
    const b = s({ id: 'b', hora_inicio: '08:00', hora_fim: '09:00' })
    const dias = [d({ sessoes: [a, b] })]
    expect(sessoesEmConflito(dias, ['a', 'b'])).toEqual(new Set())
  })

  it('hora_fim menor que inicio (vira dia) não trava nem acusa falso', () => {
    const a = s({ id: 'a', hora_inicio: '23:00', hora_fim: '01:00' })
    const b = s({ id: 'b', hora_inicio: '08:00', hora_fim: '09:00' })
    const dias = [d({ sessoes: [a, b] })]
    expect(sessoesEmConflito(dias, ['a', 'b'])).toEqual(new Set())
  })

  it('três sessões: só as duas que colidem entram', () => {
    const a = s({ id: 'a', hora_inicio: '08:00', hora_fim: '09:00' })
    const b = s({ id: 'b', hora_inicio: '08:30', hora_fim: '09:30' })
    const c = s({ id: 'c', hora_inicio: '14:00', hora_fim: '15:00' })
    const dias = [d({ sessoes: [a, b, c] })]
    expect(sessoesEmConflito(dias, ['a', 'b', 'c'])).toEqual(new Set(['a', 'b']))
  })

  it('tolera dias nulo', () => {
    expect(sessoesEmConflito(null as unknown as Dia[], ['a'])).toEqual(new Set())
  })
})

describe('formatarDiaLongo', () => {
  it('formata com dia da semana abreviado', () => {
    // 2026-08-10 é uma segunda-feira
    expect(formatarDiaLongo('2026-08-10')).toBe('seg, 10/08')
  })

  it('string vazia vira vazio', () => {
    expect(formatarDiaLongo('')).toBe('')
  })
})
