'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

// Barra de abas do evento (organizador): Evento · Programação · Gerenciamento ·
// Equipe. A aba ativa vem do pathname. Check-in é tela à parte (câmera),
// alcançada por dentro de Gerenciamento — não é aba. A aba Equipe aparece para
// quem pode editar (dono ou editor) — eles convidam; só o dono revoga.
export function AbasEvento({
  id,
  podeEditar,
}: {
  id: string
  podeEditar?: boolean
}) {
  const pathname = usePathname()
  const base = `/eventos/${id}`

  const abas = [
    { href: base, label: 'Evento' },
    { href: `${base}/sessoes`, label: 'Programação' },
    { href: `${base}/inscritos`, label: 'Gerenciamento' },
    ...(podeEditar ? [{ href: `${base}/equipe`, label: 'Equipe' }] : []),
  ]

  // Fade nas bordas indicando que há mais abas para rolar (só quando há overflow).
  const scroller = useRef<HTMLDivElement>(null)
  const [temMaisEsq, setTemMaisEsq] = useState(false)
  const [temMaisDir, setTemMaisDir] = useState(false)

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const atualizar = () => {
      setTemMaisEsq(el.scrollLeft > 4)
      setTemMaisDir(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    }
    atualizar()
    el.addEventListener('scroll', atualizar, { passive: true })
    window.addEventListener('resize', atualizar)
    return () => {
      el.removeEventListener('scroll', atualizar)
      window.removeEventListener('resize', atualizar)
    }
  }, [])

  return (
    <div className="relative -mt-2 mb-8">
      <nav ref={scroller} className="border-b border-line overflow-x-auto no-scrollbar">
        <div className="flex gap-1 min-w-max">
          {abas.map((a) => {
            const ativa = a.href === base ? pathname === base : pathname.startsWith(a.href)
            return (
              <Link
                key={a.href}
                href={a.href}
                className={`px-4 py-3 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
                  ativa
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {a.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Sombras-fade nas pontas: some quando não há mais para rolar naquele lado. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-sand to-transparent transition-opacity ${
          temMaisEsq ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-sand to-transparent transition-opacity ${
          temMaisDir ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  )
}
