'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { aceitarConvite } from './actions'

// Tela de aceite de convite (/convite/[token]). Client — precisa de estado para
// mostrar erro/carregando e navegar após aceitar.
export function Aceite({ token, nomeEvento, papel }: { token: string; nomeEvento: string; papel: string }) {
  const router = useRouter()
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function aceitar() {
    setEnviando(true); setErro(null)
    const res = await aceitarConvite(token)
    if (res.ok && res.eventoId) { router.push(`/eventos/${res.eventoId}`); return }
    setEnviando(false); setErro(res.erro ?? 'Não foi possível aceitar.')
  }

  return (
    <div className="max-w-[440px] mx-auto px-6 py-16 text-center">
      <h1 className="font-display text-2xl font-semibold text-secondary">Convite para organizar</h1>
      <p className="text-muted mt-2">
        Você foi convidado para <strong>{nomeEvento}</strong> como <strong>{papel}</strong>.
      </p>
      <Button type="button" onClick={aceitar} disabled={enviando} block className="mt-6">
        {enviando ? 'Aceitando…' : 'Aceitar convite'}
      </Button>
      {erro && <p className="text-error text-sm mt-3">{erro}</p>}
    </div>
  )
}
