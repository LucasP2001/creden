'use client'

import { useEffect, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/Badge'
import { FUSO_BR, formatarHora } from '@/lib/datas'
import { Inscricao } from '@/types'
import {
  sessoesDoInscrito,
  marcarPresenca,
  desfazerPresenca,
  cancelarInscricao,
  reenviarBilhete,
  type SessaoResumo,
  type AcaoResult,
} from './actions'

interface DetalheProps {
  eventoId: string
  inscricao: Inscricao
  podeEditar: boolean
  podeCheckin: boolean
  onFechar: () => void
  onResultado: (res: AcaoResult, sucesso: string) => void
}

function dataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: FUSO_BR,
  })
}

export function DetalheInscritoModal({
  eventoId, inscricao, podeEditar, podeCheckin, onFechar, onResultado,
}: DetalheProps) {
  const [sessoes, setSessoes] = useState<SessaoResumo[] | null>(null)
  const [erroSessoes, setErroSessoes] = useState<string | null>(null)
  const [pendente, startTransition] = useTransition()

  useEffect(() => {
    let vivo = true
    setSessoes(null)
    setErroSessoes(null)
    sessoesDoInscrito(eventoId, inscricao.id).then((r) => {
      if (vivo) {
        if (r.ok) {
          setSessoes(r.sessoes ?? [])
        } else {
          setErroSessoes('Não foi possível carregar as sessões.')
          setSessoes([])
        }
      }
    })
    return () => { vivo = false }
  }, [eventoId, inscricao.id])

  function rodar(fn: () => Promise<AcaoResult>, sucesso: string) {
    startTransition(async () => {
      const res = await fn()
      onResultado(res, sucesso)
      if (res.ok) onFechar()
    })
  }

  const cancelado = inscricao.status === 'cancelado'
  const presente = inscricao.status === 'presente'
  const extras = Object.entries(inscricao.dados_extras ?? {})

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4" onClick={onFechar}>
      <div
        className="bg-surface text-ink w-full max-w-lg rounded-lg mt-[8vh] max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-line flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold break-words">{inscricao.nome}</h2>
            <p className="text-sm text-muted break-words">{inscricao.email}</p>
          </div>
          <button onClick={onFechar} className="text-muted px-2 text-lg shrink-0" aria-label="Fechar">✕</button>
        </div>

        <div className="p-5 grid gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge status={inscricao.status} />
            <span className="text-sm text-muted">Inscrição {dataHora(inscricao.created_at)}</span>
            {presente && inscricao.checkin_at && (
              <span className="text-sm text-muted">Entrou às {formatarHora(inscricao.checkin_at)}</span>
            )}
          </div>

          {extras.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wide text-muted font-semibold mb-1.5">Dados</h3>
              <dl className="grid gap-1 text-sm">
                {extras.map(([label, valor]) => (
                  <div key={label} className="flex gap-2">
                    <dt className="text-muted min-w-[120px]">{label}</dt>
                    <dd className="font-medium break-words">{valor}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div>
            <h3 className="text-xs uppercase tracking-wide text-muted font-semibold mb-1.5">Sessões</h3>
            {erroSessoes ? (
              <p className="text-sm text-error">{erroSessoes}</p>
            ) : sessoes === null ? (
              <p className="text-sm text-muted">Carregando…</p>
            ) : sessoes.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma sessão marcada.</p>
            ) : (
              <ul className="grid gap-1 text-sm">
                {sessoes.map((s) => (
                  <li key={s.id} className="flex gap-2">
                    <span className="text-muted tabular-nums">{s.hora_inicio}</span>
                    <span>{s.titulo}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {(podeEditar || podeCheckin) && !cancelado && (
          <div className="p-5 border-t border-line flex flex-wrap gap-2">
            {podeCheckin && !presente && (
              <button disabled={pendente} onClick={() => rodar(() => marcarPresenca(eventoId, inscricao.id), 'Presença confirmada.')}
                className="btn btn-primary disabled:opacity-40">✓ Confirmar presença</button>
            )}
            {podeCheckin && presente && (
              <button disabled={pendente} onClick={() => rodar(() => desfazerPresenca(eventoId, inscricao.id), 'Check-in desfeito.')}
                className="btn-ghost rounded-md px-4 py-2 text-sm disabled:opacity-40">↩ Desfazer check-in</button>
            )}
            {podeEditar && (
              <button disabled={pendente} onClick={() => rodar(() => reenviarBilhete(eventoId, inscricao.id), 'Bilhete reenviado por e-mail.')}
                className="btn-ghost rounded-md px-4 py-2 text-sm disabled:opacity-40">✉ Reenviar bilhete</button>
            )}
            {podeEditar && (
              <button disabled={pendente} onClick={() => rodar(() => cancelarInscricao(eventoId, inscricao.id), 'Inscrição cancelada.')}
                className="rounded-md px-4 py-2 text-sm text-error hover:bg-error/10 disabled:opacity-40">✕ Cancelar inscrição</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
