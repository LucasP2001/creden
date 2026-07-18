'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Barra de abas do evento (organizador): Evento (editar) · Programação ·
// Gerenciamento. A aba ativa vem do pathname. Check-in é tela à parte (câmera),
// alcançada por dentro de Gerenciamento — não é aba.
export function AbasEvento({ id }: { id: string }) {
  const pathname = usePathname()
  const base = `/eventos/${id}`

  const abas = [
    { href: base, label: 'Evento' },
    { href: `${base}/sessoes`, label: 'Programação' },
    { href: `${base}/inscritos`, label: 'Gerenciamento' },
  ]

  return (
    <nav className="border-b border-line -mt-2 mb-8">
      <div className="flex gap-1">
        {abas.map((a) => {
          const ativa = a.href === base ? pathname === base : pathname.startsWith(a.href)
          return (
            <Link
              key={a.href}
              href={a.href}
              className={`px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
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
