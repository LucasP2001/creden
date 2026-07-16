'use client'

import { useState } from 'react'
import { reenviarIngresso } from './actions'

// Botão de reenvio do ingresso por e-mail (tela /i/[token]).
export function ReenviarBotao({ token, email }: { token: string; email: string }) {
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok' | 'erro'>('idle')
  const [msg, setMsg] = useState('')

  async function reenviar() {
    setEstado('enviando')
    const res = await reenviarIngresso(token)
    if (res.ok) {
      setEstado('ok')
      setMsg(`Reenviado para ${email}`)
    } else {
      setEstado('erro')
      setMsg(res.erro ?? 'Falha ao reenviar.')
    }
  }

  return (
    <div className="text-center mt-4">
      <button
        onClick={reenviar}
        disabled={estado === 'enviando' || estado === 'ok'}
        className={`text-sm font-semibold underline underline-offset-4 decoration-primary/40 disabled:no-underline min-h-[44px] px-3 ${
          estado === 'ok' ? 'text-success' : 'text-primary'
        }`}
      >
        {estado === 'enviando'
          ? 'Reenviando…'
          : estado === 'ok'
            ? '✓ E-mail reenviado'
            : '✉ Reenviar e-mail'}
      </button>
      {msg && (
        <p className={`text-xs mt-1 ${estado === 'erro' ? 'text-error' : 'text-muted'}`}>{msg}</p>
      )}
    </div>
  )
}
