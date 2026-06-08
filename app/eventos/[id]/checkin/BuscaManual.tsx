'use client'

import { useEffect, useState } from 'react'
import { createBrowserSupabase } from '@/lib/supabase-browser'
import { Inscricao } from '@/types'

type InscricaoCheckin = Pick<Inscricao, 'id' | 'nome' | 'status' | 'checkin_at'>

interface Props {
  eventoId: string
  onFechar: () => void
  onSelecionar: (insc: InscricaoCheckin) => void
}

// Busca manual por nome — fallback do check-in quando o QR não lê.
export function BuscaManual({ eventoId, onFechar, onSelecionar }: Props) {
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<InscricaoCheckin[]>([])
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    const q = termo.trim()
    if (q.length < 2) {
      setResultados([])
      return
    }
    setBuscando(true)
    const t = setTimeout(async () => {
      const supabase = createBrowserSupabase()
      const { data } = await supabase
        .from('inscricoes')
        .select('id, nome, status, checkin_at')
        .eq('evento_id', eventoId)
        .ilike('nome', `%${q}%`)
        .order('nome')
        .limit(20)
      setResultados((data ?? []) as InscricaoCheckin[])
      setBuscando(false)
    }, 250) // debounce
    return () => clearTimeout(t)
  }, [termo, eventoId])

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4" onClick={onFechar}>
      <div
        className="bg-surface text-ink w-full max-w-md rounded-lg mt-[10vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-line flex items-center gap-2">
          <input
            autoFocus
            className="input"
            placeholder="Buscar inscrito por nome…"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
          />
          <button onClick={onFechar} className="text-muted px-2 text-lg" aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="max-h-[50vh] overflow-auto">
          {termo.trim().length < 2 && (
            <p className="p-5 text-sm text-muted text-center">Digite ao menos 2 letras.</p>
          )}
          {termo.trim().length >= 2 && !buscando && resultados.length === 0 && (
            <p className="p-5 text-sm text-muted text-center">Nenhum inscrito encontrado.</p>
          )}
          {resultados.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelecionar(r)}
              className="w-full text-left px-4 py-3 border-b border-line last:border-0 hover:bg-[#faf8f3] flex items-center justify-between gap-3"
            >
              <span className="font-semibold text-sm">{r.nome}</span>
              {r.status === 'presente' ? (
                <span className="badge badge-presente">Presente</span>
              ) : r.status === 'cancelado' ? (
                <span className="badge badge-cancelado">Cancelado</span>
              ) : (
                <span className="badge badge-inscrito">Inscrito</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
