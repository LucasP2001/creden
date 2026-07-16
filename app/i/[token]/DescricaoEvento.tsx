'use client'

import { useState } from 'react'

/** Acima disso a descrição nasce recolhida — o foco da tela é escolher palestras. */
const LIMITE_CHARS = 140

// Descrição do evento com "ver mais". Texto curto é mostrado inteiro, sem botão.
export function DescricaoEvento({ texto }: { texto: string }) {
  const [aberta, setAberta] = useState(false)
  const longa = texto.length > LIMITE_CHARS

  return (
    <div className="mt-3">
      <p
        className={`text-sm leading-relaxed text-[#3a3833] whitespace-pre-line break-words ${
          longa && !aberta ? 'line-clamp-2' : ''
        }`}
      >
        {texto}
      </p>
      {longa && (
        <button
          type="button"
          onClick={() => setAberta((v) => !v)}
          className="text-xs font-semibold text-primary underline underline-offset-4 decoration-primary/40 mt-1 min-h-[44px]"
        >
          {aberta ? 'Ver menos' : 'Ver mais'}
        </button>
      )}
    </div>
  )
}
