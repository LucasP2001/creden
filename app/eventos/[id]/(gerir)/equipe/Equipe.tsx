'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Colaborador } from '@/types'
import { convidarColaborador, revogarColaborador, reenviarConvite } from './actions'

const PAPEIS = ['editor', 'checkin']
const rotuloPapel = (p: string) => (p === 'editor' ? 'Editor' : 'Check-in')

// Aba "Equipe" — dono e editor veem e convidam; só o dono revoga (podeRevogar).
// Convida por e-mail (editor ou check-in) e lista os colaboradores.
export function Equipe({
  eventoId,
  colaboradores,
  podeRevogar,
}: {
  eventoId: string
  colaboradores: Colaborador[]
  podeRevogar?: boolean
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [papel, setPapel] = useState('checkin')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  // id do convite sendo reenviado; e id do que acabou de reenviar (mostra "Enviado").
  const [reenviando, setReenviando] = useState<string | null>(null)
  const [reenviado, setReenviado] = useState<string | null>(null)

  async function convidar() {
    setEnviando(true); setErro(null)
    const fd = new FormData()
    fd.set('email', email); fd.set('papel', papel)
    const res = await convidarColaborador(eventoId, fd)
    setEnviando(false)
    if (!res.ok) { setErro(res.erro ?? 'Falha ao convidar.'); return }
    setEmail(''); router.refresh()
  }

  async function revogar(id: string) {
    await revogarColaborador(eventoId, id)
    router.refresh()
  }

  async function reenviar(id: string) {
    setReenviando(id); setErro(null); setReenviado(null)
    const res = await reenviarConvite(eventoId, id)
    setReenviando(null)
    if (!res.ok) { setErro(res.erro ?? 'Não foi possível reenviar.'); return }
    setReenviado(id)
  }

  return (
    <div className="card p-[22px]">
      <h2 className="text-lg font-semibold">Equipe</h2>
      <p className="text-xs text-muted mt-1 mb-4">
        Convide pessoas para ajudar. Editor mexe em tudo; check-in só faz a portaria.
      </p>

      <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto] items-start">
        <input
          className="input" type="text" inputMode="email" placeholder="email@exemplo.com"
          value={email} onChange={(e) => setEmail(e.target.value)}
        />
        <Select name="papel" opcoes={PAPEIS.map(rotuloPapel)}
          value={rotuloPapel(papel)}
          onChange={(v) => setPapel(v === 'Editor' ? 'editor' : 'checkin')} />
        <Button type="button" onClick={convidar} disabled={enviando}>
          {enviando ? 'Enviando…' : 'Convidar'}
        </Button>
      </div>
      {erro && <p className="text-error text-sm mt-2">{erro}</p>}

      <ul className="mt-5 grid gap-2">
        {colaboradores.length === 0 && (
          <li className="text-sm text-muted">Ninguém convidado ainda.</li>
        )}
        {colaboradores.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 border border-line rounded-xl px-3.5 py-2.5">
            <div className="min-w-0">
              <div className="text-sm font-semibold break-words">{c.email}</div>
              <div className="text-xs text-muted">
                {rotuloPapel(c.papel)} · {c.status === 'ativo' ? 'ativo' : 'convite pendente'}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {c.status === 'pendente' && (
                reenviado === c.id ? (
                  <span className="text-status-presente text-sm">Enviado ✓</span>
                ) : (
                  <button
                    onClick={() => reenviar(c.id)}
                    disabled={reenviando === c.id}
                    className="text-primary text-sm hover:underline disabled:opacity-50"
                  >
                    {reenviando === c.id ? 'Enviando…' : 'Reenviar'}
                  </button>
                )
              )}
              {podeRevogar && (
                <button onClick={() => revogar(c.id)} className="text-error text-sm hover:underline">
                  Revogar
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
