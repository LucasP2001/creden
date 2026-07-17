'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

export type AbaId = 'inscricao' | 'programacao' | 'ingresso'

interface Props {
  nomeEvento: string
  ativa: AbaId
  onTrocar: (id: AbaId) => void
  children: ReactNode
}

const ABAS: { id: AbaId; rotulo: string }[] = [
  { id: 'inscricao', rotulo: 'Inscrição' },
  { id: 'programacao', rotulo: 'Programação' },
  { id: 'ingresso', rotulo: 'Ingresso' },
]

/**
 * Barra de abas da página do participante. Gruda no topo ao rolar e, só quando o
 * título do evento sai de vista, revela o nome dele — assim a referência de
 * "onde estou" não some numa lista de vários dias, sem repetir o título à toa.
 * Estado fica no pai (o conteúdo depende das marcações).
 */
export function Abas({ nomeEvento, ativa, onTrocar, children }: Props) {
  const sentinela = useRef<HTMLDivElement>(null)
  const [grudada, setGrudada] = useState(false)

  useEffect(() => {
    const el = sentinela.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => setGrudada(!e.isIntersecting))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div className="min-w-0">
      {/* Marca onde a barra deixa de estar no fluxo e passa a grudar. */}
      <div ref={sentinela} aria-hidden className="h-px" />

      <div className="sticky top-0 z-30 -mx-5 px-5 bg-sand/95 backdrop-blur border-b border-line">
        <div
          className={`text-xs text-muted truncate transition-all ${
            grudada ? 'pt-2 max-h-6 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          {nomeEvento}
        </div>
        <div className="flex gap-0.5 sm:gap-1" role="tablist">
          {ABAS.map((a) => {
            const on = ativa === a.id
            return (
              <button
                key={a.id}
                role="tab"
                aria-selected={on}
                onClick={() => onTrocar(a.id)}
                className={`flex-1 sm:flex-none px-2 sm:px-3.5 py-3 text-sm whitespace-nowrap min-h-[44px] border-b-2 transition-colors ${
                  on
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted hover:text-secondary'
                }`}
              >
                {a.rotulo}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-5 min-w-0">{children}</div>
    </div>
  )
}
