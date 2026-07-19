'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

// Navegação do evento. No desktop, pills segmentadas (seção atual cheia em
// verde-petróleo). No mobile, um seletor: mostra a seção atual e abre a lista ao
// tocar — ocupa uma linha só, nada corta.
// Check-in é tela à parte (câmera), alcançada por Gerenciamento — não é seção.
// Equipe aparece só para quem pode editar (dono ou editor); só o dono revoga.
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

  const ehAtiva = (href: string) => (href === base ? pathname === base : pathname.startsWith(href))
  const atual = abas.find((a) => ehAtiva(a.href)) ?? abas[0]

  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    function fora(e: MouseEvent) {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto])

  return (
    <nav className="-mt-2 mb-8">
      {/* Desktop: pills segmentadas */}
      <div className="hidden sm:flex flex-wrap gap-2">
        {abas.map((a) => {
          const ativa = ehAtiva(a.href)
          return (
            <Link
              key={a.href}
              href={a.href}
              aria-current={ativa ? 'page' : undefined}
              className={`rounded-pill px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                ativa
                  ? 'bg-primary text-white shadow-card'
                  : 'border border-line bg-surface text-muted hover:text-ink hover:border-primary-light'
              }`}
            >
              {a.label}
            </Link>
          )
        })}
      </div>

      {/* Mobile: seletor da seção atual */}
      <div ref={raiz} className="relative sm:hidden">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          aria-haspopup="listbox"
          className="input flex items-center justify-between gap-2 text-left font-semibold"
        >
          <span className="text-ink">{atual.label}</span>
          <svg
            className={`w-4 h-4 shrink-0 text-muted transition-transform ${aberto ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden
          >
            <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {aberto && (
          <ul
            role="listbox"
            className="absolute z-30 mt-1.5 w-full rounded-md border border-line bg-surface py-1 shadow-lift animate-fade-up"
          >
            {abas.map((a) => {
              const ativa = ehAtiva(a.href)
              return (
                <li key={a.href} role="option" aria-selected={ativa}>
                  <Link
                    href={a.href}
                    onClick={() => setAberto(false)}
                    className={`block px-3.5 py-2.5 text-[15px] ${
                      ativa ? 'text-primary font-semibold' : 'text-ink'
                    }`}
                  >
                    {a.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </nav>
  )
}
