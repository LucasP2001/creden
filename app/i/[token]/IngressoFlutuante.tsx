'use client'

import { useEffect, useState } from 'react'

// Atalho para o ingresso no mobile: rola até o card do QR.
// Some quando o próprio ingresso está visível (lá o botão só atrapalharia) e
// no desktop, onde o ingresso já fica fixo na coluna lateral.
export function IngressoFlutuante() {
  const [visivel, setVisivel] = useState(true)

  useEffect(() => {
    const alvo = document.getElementById('ingresso')
    if (!alvo) return
    const obs = new IntersectionObserver(([e]) => setVisivel(!e.isIntersecting), {
      // Só considera "à vista" quando uma fatia real do ingresso apareceu.
      threshold: 0.15,
    })
    obs.observe(alvo)
    return () => obs.disconnect()
  }, [])

  if (!visivel) return null

  return (
    <button
      type="button"
      onClick={() => document.getElementById('ingresso')?.scrollIntoView({ behavior: 'smooth' })}
      className="lg:hidden fixed bottom-4 right-4 z-20 h-12 pl-4 pr-5 rounded-pill bg-secondary text-white font-semibold text-sm shadow-lift flex items-center gap-2"
    >
      <span aria-hidden>🎟</span> Meu ingresso
    </button>
  )
}
