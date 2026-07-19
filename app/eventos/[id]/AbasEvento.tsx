'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Navegação do evento em "pills" segmentadas: a seção atual é uma pill cheia em
// verde-petróleo, as demais em contorno. Substitui as tabs-sublinhado (que
// cortavam no mobile) — as pills embrulham para a segunda linha se faltar espaço.
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

  return (
    <nav className="-mt-2 mb-8">
      <div className="flex flex-wrap gap-2">
        {abas.map((a) => {
          const ativa = a.href === base ? pathname === base : pathname.startsWith(a.href)
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
    </nav>
  )
}
