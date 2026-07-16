'use client'

import type { ReactNode } from 'react'

export type AbaId = 'inscricao' | 'programacao' | 'ingresso'

interface Props {
  nomeEvento: string
  ativa: AbaId
  onTrocar: (id: AbaId) => void
  /** Mostrado ao lado do rótulo "Inscrição" (ex.: "2/8"). */
  selo?: string
  children: ReactNode
}

const ABAS: { id: AbaId; rotulo: string }[] = [
  { id: 'inscricao', rotulo: 'Inscrição' },
  { id: 'programacao', rotulo: 'Programação' },
  { id: 'ingresso', rotulo: 'Ingresso' },
]

/**
 * Barra de abas da página do participante. Gruda no topo ao rolar, junto de uma
 * linha fina com o nome do evento — a referência de "onde estou" não some numa
 * lista de vários dias. Estado fica no pai (o conteúdo depende das marcações).
 */
export function Abas({ nomeEvento, ativa, onTrocar, selo, children }: Props) {
  return (
    <div className="min-w-0">
      <div className="sticky top-0 z-30 -mx-5 px-5 bg-sand/95 backdrop-blur border-b border-line">
        <div className="pt-2 text-xs text-muted truncate">{nomeEvento}</div>
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
                {a.id === 'inscricao' && selo && (
                  <span
                    className={`ml-1.5 text-[11px] tabular-nums px-1.5 py-0.5 rounded-pill ${
                      on ? 'bg-status-inscrito-bg text-primary' : 'bg-line/60 text-muted'
                    }`}
                  >
                    {selo}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-5 min-w-0">{children}</div>
    </div>
  )
}
