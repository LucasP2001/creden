'use client'

import { useState } from 'react'
import { Dia, Sessao } from '@/types'
import { rotuloTipo } from '@/lib/sessoes'
import { atualizarSessoes } from './actions'

interface Props {
  token: string
  dias: Dia[]
  marcadasIniciais: string[]
  contagens: Record<string, number>
}

// Editor de marcações de sessão no ingresso. Salva via server action.
export function SessoesEditor({ token, dias, marcadasIniciais, contagens }: Props) {
  const [marcadas, setMarcadas] = useState<string[]>(marcadasIniciais)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  if (!dias || dias.length === 0) return null

  function toggle(id: string, on: boolean) {
    setMarcadas((m) => (on ? [...m, id] : m.filter((x) => x !== id)))
  }

  function check(s: Sessao) {
    // Intervalo/pausa: só informativo, sem checkbox.
    if (s.sem_inscricao) {
      return (
        <div key={s.id} className="flex items-center gap-2 text-sm text-muted">
          <span className="w-4" />
          <span>{s.titulo} · {s.hora_inicio}</span>
        </div>
      )
    }
    const on = marcadas.includes(s.id)
    const lotada = s.vagas_max != null && !on && (contagens[s.id] ?? 0) >= s.vagas_max
    return (
      <label key={s.id} className={`flex items-center gap-2 text-sm ${lotada ? 'opacity-50' : ''}`}>
        <input
          type="checkbox"
          disabled={lotada}
          checked={on}
          onChange={(e) => toggle(s.id, e.target.checked)}
        />
        <span>
          {s.titulo} <span className="text-muted">· {rotuloTipo(s)} · {s.hora_inicio}</span>
        </span>
      </label>
    )
  }

  async function salvar() {
    setSalvando(true)
    setMsg(null)
    const res = await atualizarSessoes(token, marcadas)
    setSalvando(false)
    setMsg(res.aviso ?? (res.ok ? 'Sessões atualizadas.' : res.erro ?? 'Erro ao salvar.'))
  }

  return (
    <div className="px-6 py-4 border-t border-line">
      <div className="text-sm font-semibold">Escolha suas palestras</div>
      <p className="text-xs text-muted mb-2">Marque as sessões que você vai participar.</p>
      <div className="grid gap-3">
        {dias.map((d, i) => (
          <div key={d.id} className="grid gap-1.5">
            <span className="text-xs font-semibold text-primary">Dia {i + 1}</span>
            {d.sessoes.map(check)}
            {d.categorias.map((c) => (
              <div key={c.id} className="grid gap-1.5">
                <span className="text-xs font-semibold text-secondary">{c.titulo}</span>
                {c.sessoes.map(check)}
              </div>
            ))}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={salvar}
        disabled={salvando}
        className="btn btn-secondary mt-3 text-sm"
      >
        {salvando ? 'Salvando…' : 'Salvar sessões'}
      </button>
      {msg && <p className="text-xs text-muted mt-2">{msg}</p>}
    </div>
  )
}
