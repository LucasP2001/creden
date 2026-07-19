'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Barra de abas do evento (organizador): Evento · Programação · Gerenciamento ·
// Equipe. A aba ativa vem do pathname. Check-in é tela à parte (câmera),
// alcançada por dentro de Gerenciamento — não é aba. A aba Equipe aparece para
// quem pode editar (dono ou editor) — eles convidam; só o dono revoga.
//
// As abas quebram linha no mobile (flex-wrap): todas ficam visíveis sem scroll
// escondido. No desktop cabem numa linha só.
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

  return (
    <nav className="border-b border-line -mt-2 mb-8">
      <div className="flex flex-wrap gap-x-1 gap-y-0">
        {abas.map((a) => {
          const ativa = a.href === base ? pathname === base : pathname.startsWith(a.href)
          return (
            <Link
              key={a.href}
              href={a.href}
              className={`px-3.5 sm:px-4 py-3 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
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
  )
}
