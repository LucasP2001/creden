'use client'

import { useState } from 'react'
import { reenviarPorEmail } from '@/app/i/[token]/actions'

// "Já se inscreveu?" — reenvia o link de acesso (/i/[token]) por e-mail.
export function RecuperarAcesso({ slug }: { slug: string }) {
  const [aberto, setAberto] = useState(false)
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setMsg(null)
    const res = await reenviarPorEmail(slug, email)
    setEnviando(false)
    setMsg(
      res.ok
        ? 'Se houver uma inscrição com esse e-mail, enviamos o link de acesso. Confira sua caixa de entrada.'
        : res.erro ?? 'Não foi possível enviar agora.'
    )
  }

  return (
    <div className="text-center mt-6">
      {!aberto ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="text-sm text-primary hover:underline"
        >
          Já se inscreveu? Reenviar meu acesso
        </button>
      ) : (
        <form onSubmit={enviar} className="max-w-sm mx-auto grid gap-2.5">
          <p className="text-sm text-muted">
            Informe o e-mail da inscrição e enviaremos o link para escolher suas palestras.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              required
              className="input flex-1"
              placeholder="seu@email.com"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
            />
            <button type="submit" className="btn btn-secondary" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
          {msg && <p className="text-sm text-muted">{msg}</p>}
        </form>
      )}
    </div>
  )
}
