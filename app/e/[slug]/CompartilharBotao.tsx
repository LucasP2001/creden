'use client'

import { useState } from 'react'

// Botão de compartilhar a página do evento.
// No celular usa a Web Share API nativa; no desktop copia o link.
export function CompartilharBotao({ nome }: { nome: string }) {
  const [copiado, setCopiado] = useState(false)

  async function compartilhar() {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: nome, url })
      } catch {
        // usuário cancelou — ignora
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // sem clipboard — ignora silenciosamente
    }
  }

  return (
    <button
      onClick={compartilhar}
      className="text-sm font-semibold text-primary bg-white/95 shadow-card ring-1 ring-black/5 rounded-pill px-4 py-2 flex items-center gap-1.5 hover:bg-white transition-colors"
    >
      {copiado ? '✓ Link copiado' : '↗ Compartilhar'}
    </button>
  )
}
