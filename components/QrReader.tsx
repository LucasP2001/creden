'use client'

import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { tokenValido } from '@/lib/qr'

interface QrReaderProps {
  /** Chamado quando um QR válido (formato de token) é lido. */
  onLeitura: (token: string) => void
  /** Pausa entre leituras para não disparar o mesmo QR em loop (ms). */
  cooldownMs?: number
}

const REGION_ID = 'creden-qr-region'

// Leitor de QR via câmera (skill creden-conventions: lógica de leitura isolada).
// 'use client' porque precisa de câmera e estado.
export function QrReader({ onLeitura, cooldownMs = 2500 }: QrReaderProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const travadoAte = useRef<number>(0)

  useEffect(() => {
    const scanner = new Html5Qrcode(REGION_ID, { verbose: false })
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' }, // câmera traseira no celular
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (texto) => {
          const agora = Date.now()
          if (agora < travadoAte.current) return
          travadoAte.current = agora + cooldownMs
          if (tokenValido(texto)) onLeitura(texto.trim())
          else onLeitura(texto.trim()) // deixa a tela decidir o feedback "inválido"
        },
        () => {
          // erro de leitura por frame — ignorado (acontece o tempo todo)
        }
      )
      .catch((err) => {
        // TODO: mostrar erro de permissão de câmera na UI
        console.error('Falha ao iniciar a câmera:', err)
      })

    return () => {
      scanner.stop().catch(() => {})
      scanner.clear()
    }
  }, [onLeitura, cooldownMs])

  return <div id={REGION_ID} className="w-full overflow-hidden rounded-[24px]" />
}
