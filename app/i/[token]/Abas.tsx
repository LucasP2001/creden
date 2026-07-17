'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

export type AbaId = 'inscricao' | 'programacao' | 'ingresso'

interface Props {
  nomeEvento: string
  ativa: AbaId
  onTrocar: (id: AbaId) => void
  children: ReactNode
}

const ABAS: { id: AbaId; rotulo: string; soMobile?: boolean }[] = [
  { id: 'inscricao', rotulo: 'Inscrição' },
  { id: 'programacao', rotulo: 'Programação' },
  // No desktop o ingresso já fica fixo na coluna lateral: a aba deixaria a
  // coluna principal vazia.
  { id: 'ingresso', rotulo: 'Ingresso', soMobile: true },
]

/**
 * Barra de abas da página do participante. Gruda no topo ao rolar e, só quando o
 * título do evento sai de vista, revela o nome dele — assim a referência de
 * "onde estou" não some numa lista de vários dias, sem repetir o título à toa.
 * Estado fica no pai (o conteúdo depende das marcações).
 */
export function Abas({ nomeEvento, ativa, onTrocar, children }: Props) {
  const sentinela = useRef<HTMLDivElement>(null)
  const barra = useRef<HTMLDivElement>(null)
  const [grudada, setGrudada] = useState(false)

  useEffect(() => {
    const el = sentinela.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => setGrudada(!e.isIntersecting))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Publica a altura real da barra para quem gruda abaixo dela (o header do dia).
  // Ela cresce quando o nome do evento aparece, então um valor fixo desalinharia.
  // A var vai no <html> — escrever num ancestral observado realimentaria o
  // ResizeObserver.
  useEffect(() => {
    const el = barra.current
    if (!el) return
    let ultima = -1
    const medir = () => {
      const h = Math.round(el.getBoundingClientRect().height)
      if (h === ultima) return
      ultima = h
      document.documentElement.style.setProperty('--altura-abas', `${h}px`)
    }
    medir()
    const obs = new ResizeObserver(medir)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div className="min-w-0">
      {/* Marca onde a barra deixa de estar no fluxo e passa a grudar. */}
      <div ref={sentinela} aria-hidden className="h-px" />

      <div
        ref={barra}
        className="sticky top-0 z-30 -mx-5 px-5 bg-sand backdrop-blur border-b border-line"
      >
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
                  a.soMobile ? 'lg:hidden' : ''
                } ${
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
