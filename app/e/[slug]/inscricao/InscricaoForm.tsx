'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CampoExtra } from '@/types'
import { inscrever } from './actions'

interface Props {
  slug: string
  camposExtras: CampoExtra[]
}

// Formulário público de inscrição. Tom acolhedor (skill creden-design).
export function InscricaoForm({ slug, camposExtras }: Props) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  async function enviar(formData: FormData) {
    setEnviando(true)
    setErro(null)
    const res = await inscrever(slug, formData)
    setEnviando(false)
    if (res.ok) setSucesso(true)
    else setErro(res.erro ?? 'Não foi possível concluir sua inscrição. Tente novamente.')
  }

  if (sucesso) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl">🎟️</div>
        <h2 className="font-display text-2xl font-semibold mt-3">Inscrição confirmada!</h2>
        <p className="text-muted mt-2">
          Seu ingresso com QR code foi enviado para o seu e-mail. Apresente na entrada — é só isso.
        </p>
      </div>
    )
  }

  return (
    <form action={enviar} className="card p-[22px] grid gap-[18px]">
      <Input label="Nome completo" name="nome" required placeholder="Seu nome" />
      <Input label="E-mail" name="email" type="email" required placeholder="seu@email.com" />

      {camposExtras.map((c) => (
        <div key={c.id}>
          <label className="block text-[13px] font-semibold mb-1.5">{c.label}</label>
          {c.tipo === 'opcoes' ? (
            <select className="input" name={`extra_${c.id}`} required={c.obrigatorio}>
              <option value="">Selecione…</option>
              {c.opcoes?.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="input"
              name={`extra_${c.id}`}
              type={c.tipo === 'numero' ? 'number' : 'text'}
              required={c.obrigatorio}
            />
          )}
        </div>
      ))}

      {erro && <p className="text-error text-sm">{erro}</p>}

      <Button type="submit" block disabled={enviando}>
        {enviando ? 'Enviando…' : 'Confirmar inscrição'}
      </Button>
      <p className="text-xs text-muted text-center">
        Você receberá o ingresso digital por e-mail.
      </p>
    </form>
  )
}
