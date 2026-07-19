'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { aceitarConvite, recusarConvite } from './actions'

// Tela de aceite de convite (/convite/[token]). Client — precisa de estado para
// mostrar erro/carregando e navegar após responder (aceitar ou recusar).
export function Aceite({ token, nomeEvento, papel }: { token: string; nomeEvento: string; papel: string }) {
  const router = useRouter()
  const [erro, setErro] = useState<string | null>(null)
  const [acao, setAcao] = useState<'aceitar' | 'recusar' | null>(null)

  async function aceitar() {
    setAcao('aceitar'); setErro(null)
    const res = await aceitarConvite(token)
    if (res.ok && res.eventoId) { router.push(`/eventos/${res.eventoId}`); return }
    setAcao(null); setErro(res.erro ?? 'Não foi possível aceitar.')
  }

  async function recusar() {
    setAcao('recusar'); setErro(null)
    const res = await recusarConvite(token)
    if (res.ok) { router.push('/dashboard'); return }
    setAcao(null); setErro(res.erro ?? 'Não foi possível recusar.')
  }

  const ocupado = acao !== null

  return (
    <div className="max-w-[440px] mx-auto px-6 py-16 text-center">
      <h1 className="font-display text-2xl font-semibold text-secondary">Convite para organizar</h1>
      <p className="text-muted mt-2">
        Você foi convidado para <strong>{nomeEvento}</strong> como <strong>{papel}</strong>.
      </p>
      <Button type="button" onClick={aceitar} disabled={ocupado} block className="mt-6">
        {acao === 'aceitar' ? 'Aceitando…' : 'Aceitar convite'}
      </Button>
      <Button type="button" variant="ghost" onClick={recusar} disabled={ocupado} block className="mt-2.5">
        {acao === 'recusar' ? 'Recusando…' : 'Recusar'}
      </Button>
      {erro && <p className="text-error text-sm mt-3">{erro}</p>}
    </div>
  )
}
