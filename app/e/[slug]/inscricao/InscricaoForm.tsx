'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CampoExtra, Dia, Sessao } from '@/types'
import { rotuloTipo } from '@/lib/sessoes'
import { inscrever } from './actions'

interface Props {
  slug: string
  camposExtras: CampoExtra[]
  dias: Dia[]
  contagens: Record<string, number>
}


// Formulário público de inscrição. Tom acolhedor (skill creden-design).
export function InscricaoForm({ slug, camposExtras, dias, contagens }: Props) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [marcadas, setMarcadas] = useState<string[]>([])

  async function enviar(formData: FormData) {
    setEnviando(true)
    setErro(null)
    formData.set('sessoes_marcadas', JSON.stringify(marcadas))
    const res = await inscrever(slug, formData)
    setEnviando(false)
    if (res.ok) {
      setAviso(res.aviso ?? null)
      setSucesso(true)
    } else setErro(res.erro ?? 'Não foi possível concluir sua inscrição. Tente novamente.')
  }

  if (sucesso) {
    return (
      <div className="card p-8 text-center">
        <div className="text-4xl">🎟️</div>
        <h2 className="font-display text-2xl font-semibold mt-3">Inscrição confirmada!</h2>
        <p className="text-muted mt-2">
          Seu ingresso com QR code foi enviado para o seu e-mail. Apresente na entrada — é só isso.
        </p>
        {aviso && <p className="text-warning text-sm mt-2">{aviso}</p>}
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

      {dias.length > 0 && (
        <div className="grid gap-4">
          <span className="text-[13px] font-semibold">Quero participar de:</span>
          {dias.map((d, i) => {
            const toggle = (id: string, on: boolean) =>
              setMarcadas((m) => (on ? [...m, id] : m.filter((x) => x !== id)))
            const check = (s: Sessao) => (
              <SessaoCheck
                key={s.id}
                s={s}
                on={marcadas.includes(s.id)}
                lotada={s.vagas_max != null && (contagens[s.id] ?? 0) >= s.vagas_max}
                onToggle={toggle}
              />
            )
            return (
              <div key={d.id} className="grid gap-1.5">
                <span className="text-[13px] font-semibold text-primary">
                  Dia {i + 1}
                </span>
                {d.sessoes.map(check)}
                {d.categorias.map((c) => (
                  <div key={c.id} className="grid gap-1.5 mt-1">
                    <span className="text-xs font-semibold text-secondary">{c.titulo}</span>
                    {c.sessoes.map(check)}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

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

// Checkbox de uma sessão (marcar interesse). Reusado em sessões soltas e de categoria.
function SessaoCheck({
  s,
  on,
  lotada,
  onToggle,
}: {
  s: Sessao
  on: boolean
  lotada: boolean
  onToggle: (id: string, on: boolean) => void
}) {
  return (
    <label
      className={`flex items-start gap-2.5 p-2.5 rounded-md border ${
        lotada ? 'border-line opacity-50' : on ? 'border-primary bg-status-inscrito-bg' : 'border-line'
      }`}
    >
      <input
        type="checkbox"
        className="mt-1"
        disabled={lotada}
        checked={on}
        onChange={(e) => onToggle(s.id, e.target.checked)}
      />
      <span className="text-sm">
        <span className="font-semibold">{s.titulo}</span>
        <span className="text-muted">
          {' '}· {rotuloTipo(s)} · {s.hora_inicio}
        </span>
        {lotada && <span className="text-error"> · esgotado</span>}
      </span>
    </label>
  )
}
