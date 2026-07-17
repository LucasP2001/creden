'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CampoExtra } from '@/types'
import { formatarCpf, formatarTelefone, cpfValido, telefoneValido } from '@/lib/mascaras'
import { inscrever } from './actions'

interface Props {
  slug: string
  camposExtras: CampoExtra[]
}

// Formulário público de inscrição — só coleta dados. As palestras/sessões o
// participante escolhe depois, na página dele (/i/[token]), para onde é levado
// ao concluir. Tom acolhedor (skill creden-design).
export function InscricaoForm({ slug, camposExtras }: Props) {
  const router = useRouter()
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  // CPF e telefone são controlados para aplicar máscara enquanto digita.
  const [mascarados, setMascarados] = useState<Record<string, string>>({})

  function aoDigitar(campo: CampoExtra, bruto: string) {
    const v = campo.tipo === 'cpf' ? formatarCpf(bruto) : formatarTelefone(bruto)
    setMascarados((m) => ({ ...m, [campo.id]: v }))
  }

  async function enviar(formData: FormData) {
    // Valida CPF/telefone preenchidos antes de mandar (o servidor não formata).
    for (const c of camposExtras) {
      const valor = (mascarados[c.id] ?? '').trim()
      if (!valor && !c.obrigatorio) continue
      if (c.tipo === 'cpf' && valor && !cpfValido(valor)) {
        setErro(`CPF inválido em "${c.label}".`)
        return
      }
      if (c.tipo === 'telefone' && valor && !telefoneValido(valor)) {
        setErro(`Telefone inválido em "${c.label}".`)
        return
      }
    }

    setEnviando(true)
    setErro(null)
    const res = await inscrever(slug, formData)
    if (res.ok && res.token) {
      // Leva direto para a página do participante (ver inscrição + escolher sessões).
      router.push(`/i/${res.token}`)
      return
    }
    setEnviando(false)
    setErro(res.erro ?? 'Não foi possível concluir sua inscrição. Tente novamente.')
  }

  return (
    <form action={enviar} className="card p-[22px] grid gap-[18px]">
      <Input label="Nome completo" name="nome" required placeholder="Seu nome" />
      <Input label="E-mail" name="email" type="email" required placeholder="seu@email.com" />

      {camposExtras.map((c) => (
        <div key={c.id}>
          <label className="block text-[13px] font-semibold mb-1.5">
            {c.label}
            {c.obrigatorio && <span className="text-error"> *</span>}
          </label>
          {c.tipo === 'opcoes' ? (
            <select className="input" name={`extra_${c.id}`} required={c.obrigatorio}>
              <option value="">Selecione…</option>
              {c.opcoes?.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : c.tipo === 'cpf' || c.tipo === 'telefone' ? (
            <input
              className="input"
              name={`extra_${c.id}`}
              type="text"
              inputMode="numeric"
              placeholder={c.tipo === 'cpf' ? '000.000.000-00' : '(00) 00000-0000'}
              value={mascarados[c.id] ?? ''}
              onChange={(e) => aoDigitar(c, e.target.value)}
              required={c.obrigatorio}
            />
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
        Depois de confirmar, você escolhe as palestras e recebe o ingresso por e-mail.
      </p>
    </form>
  )
}
