'use client'

import { useState } from 'react'
import { Sessao } from '@/types'
import { agruparPorDia, rotuloTipo } from '@/lib/sessoes'
import { atualizarSessoes } from './actions'

interface Props {
  token: string
  sessoes: Sessao[]
  marcadasIniciais: string[]
  contagens: Record<string, number>
}

// Editor de marcações de sessão no ingresso. Salva via server action.
export function SessoesEditor({ token, sessoes, marcadasIniciais, contagens }: Props) {
  const [marcadas, setMarcadas] = useState<string[]>(marcadasIniciais)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  if (sessoes.length === 0) return null

  async function salvar() {
    setSalvando(true)
    setMsg(null)
    const res = await atualizarSessoes(token, marcadas)
    setSalvando(false)
    setMsg(res.aviso ?? (res.ok ? 'Sessões atualizadas.' : res.erro ?? 'Erro ao salvar.'))
  }

  return (
    <div className="px-6 py-4 border-t border-line">
      <div className="text-sm font-semibold mb-2">Minhas sessões</div>
      <div className="grid gap-1.5">
        {agruparPorDia(sessoes).map((g) =>
          g.itens.map((s) => {
            const on = marcadas.includes(s.id)
            const lotada = s.vagas_max != null && !on && (contagens[s.id] ?? 0) >= s.vagas_max
            return (
              <label key={s.id} className={`flex items-center gap-2 text-sm ${lotada ? 'opacity-50' : ''}`}>
                <input
                  type="checkbox"
                  disabled={lotada}
                  checked={on}
                  onChange={(e) =>
                    setMarcadas((m) => (e.target.checked ? [...m, s.id] : m.filter((x) => x !== s.id)))
                  }
                />
                <span>
                  {s.titulo} <span className="text-muted">· {rotuloTipo(s)} · {s.hora_inicio}</span>
                </span>
              </label>
            )
          })
        )}
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
