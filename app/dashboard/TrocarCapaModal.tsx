'use client'

import { useState } from 'react'
import { ImageUpload } from '@/components/ImageUpload'
import { Button } from '@/components/ui/Button'
import { trocarCapa } from './actions'

// Modal de troca de capa no dashboard. Reusa ImageUpload; envia via server action.
export function TrocarCapaModal({ eventoId }: { eventoId: string }) {
  const [aberto, setAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function enviar(formData: FormData) {
    setEnviando(true)
    setErro(null)
    formData.set('evento_id', eventoId)
    const res = await trocarCapa(formData)
    setEnviando(false)
    if (res.ok) setAberto(false)
    else setErro(res.erro ?? 'Não foi possível trocar a foto.')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-xs font-semibold text-white bg-black/40 backdrop-blur px-2.5 py-1 rounded-pill hover:bg-black/55"
      >
        Trocar foto
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 bg-black/50 grid place-items-center p-4"
          onClick={() => !enviando && setAberto(false)}
        >
          <div className="card p-6 w-[min(420px,94vw)]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Trocar foto de capa</h3>
            <form action={enviar} className="grid gap-4">
              <ImageUpload name="capa" label="Nova foto" />
              {erro && <p className="text-error text-sm">{erro}</p>}
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="ghost" onClick={() => setAberto(false)} disabled={enviando}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={enviando}>
                  {enviando ? 'Enviando…' : 'Salvar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
