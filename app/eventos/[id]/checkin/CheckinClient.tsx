'use client'

import { useCallback, useState } from 'react'
import { QrReader } from '@/components/QrReader'
import { BuscaManual } from './BuscaManual'
import { createBrowserSupabase } from '@/lib/supabase-browser'
import { tokenValido } from '@/lib/qr'
import { CheckinResultado, Inscricao } from '@/types'

// Estilos de feedback por estado (skill creden-design).
const feedbackStyle: Record<CheckinResultado['tipo'], string> = {
  sucesso: 'bg-success text-white',
  invalido: 'bg-error text-white',
  repetido: 'bg-warning text-secondary',
}

type InscricaoCheckin = Pick<Inscricao, 'id' | 'nome' | 'status' | 'checkin_at'>

export function CheckinClient({ eventoId }: { eventoId: string }) {
  const [resultado, setResultado] = useState<CheckinResultado | null>(null)
  const [total, setTotal] = useState(0)
  const [buscaAberta, setBuscaAberta] = useState(false)

  // Confirma a entrada de uma inscrição já localizada (por QR ou busca manual).
  const confirmarEntrada = useCallback(async (inscricao: InscricaoCheckin) => {
    if (inscricao.status === 'presente') {
      const hora = inscricao.checkin_at
        ? new Date(inscricao.checkin_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : ''
      setResultado({ tipo: 'repetido', nome: inscricao.nome, hora })
      return
    }

    const supabase = createBrowserSupabase()
    // RLS garante que só o dono do evento pode atualizar.
    const { error } = await supabase
      .from('inscricoes')
      .update({ status: 'presente', checkin_at: new Date().toISOString() })
      .eq('id', inscricao.id)

    if (error) {
      setResultado({ tipo: 'invalido' })
      return
    }

    setTotal((t) => t + 1)
    setResultado({ tipo: 'sucesso', nome: inscricao.nome })
  }, [])

  const processarToken = useCallback(
    async (token: string) => {
      if (!tokenValido(token)) {
        setResultado({ tipo: 'invalido' })
        return
      }

      const supabase = createBrowserSupabase()
      const { data: inscricao } = await supabase
        .from('inscricoes')
        .select('id, nome, status, checkin_at')
        .eq('evento_id', eventoId)
        .eq('token', token)
        .single()

      if (!inscricao) {
        setResultado({ tipo: 'invalido' })
        return
      }
      await confirmarEntrada(inscricao as InscricaoCheckin)
    },
    [eventoId, confirmarEntrada]
  )

  return (
    <div className="min-h-screen flex flex-col bg-secondary text-white">
      <div className="flex items-center justify-between px-[18px] py-3.5 bg-black/25">
        <span className="font-display font-semibold text-lg">🎟 Check-in</span>
        <div className="text-right leading-tight">
          <b className="font-display text-[22px]">{total}</b>
          <div className="text-xs opacity-70">entradas confirmadas</div>
        </div>
      </div>

      <div className="flex-1 grid place-items-center p-[18px] relative">
        <div className="w-[min(560px,92vw)] relative">
          <QrReader onLeitura={processarToken} />

          {resultado && (
            <div
              className={`absolute inset-0 rounded-[24px] flex flex-col items-center justify-center text-center p-6 ${feedbackStyle[resultado.tipo]}`}
            >
              <div className="w-24 h-24 rounded-full bg-white/20 grid place-items-center text-5xl mb-4">
                {resultado.tipo === 'sucesso' ? '✓' : resultado.tipo === 'invalido' ? '✕' : '!'}
              </div>
              <div className="font-display font-bold text-3xl">
                {resultado.tipo === 'sucesso' && 'Entrada confirmada'}
                {resultado.tipo === 'invalido' && 'QR inválido'}
                {resultado.tipo === 'repetido' && `Já entrou às ${resultado.hora}`}
              </div>
              {'nome' in resultado && <div className="text-xl mt-2 opacity-95">{resultado.nome}</div>}
            </div>
          )}
        </div>
      </div>

      <div className="px-[18px] py-4 pb-6 flex gap-3 justify-center bg-black/20">
        <button
          onClick={() => setBuscaAberta(true)}
          className="btn border border-white/25 bg-white/10 text-white hover:bg-white/20"
        >
          🔎 Buscar por nome
        </button>
        <a
          href={`/eventos/${eventoId}/inscritos`}
          className="btn border border-white/25 bg-white/10 text-white hover:bg-white/20"
        >
          Encerrar check-in
        </a>
      </div>

      {buscaAberta && (
        <BuscaManual
          eventoId={eventoId}
          onFechar={() => setBuscaAberta(false)}
          onSelecionar={async (insc) => {
            setBuscaAberta(false)
            await confirmarEntrada(insc)
          }}
        />
      )}
    </div>
  )
}
