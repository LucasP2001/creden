'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { CampoExtra } from '@/types'
import { comCamposFixos } from '@/lib/campos'
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
  // Campos que o usuário já saiu (blur): só aí mostramos erro, pra não acusar
  // enquanto ainda está digitando.
  const [tocados, setTocados] = useState<Record<string, boolean>>({})

  // Nome e e-mail vêm na lista (fixos), na ordem escolhida pelo organizador.
  // comCamposFixos cobre eventos antigos que ainda não têm os fixos gravados.
  const campos = useMemo(() => comCamposFixos(camposExtras), [camposExtras])

  function aoDigitar(campo: CampoExtra, bruto: string) {
    const v = campo.tipo === 'cpf' ? formatarCpf(bruto) : formatarTelefone(bruto)
    setMascarados((m) => ({ ...m, [campo.id]: v }))
  }

  /** Estado de validação de um campo CPF/telefone: 'ok' | 'erro' | null (vazio/incompleto). */
  function estadoCampo(campo: CampoExtra): 'ok' | 'erro' | null {
    const v = (mascarados[campo.id] ?? '').trim()
    if (!v) return null
    const digitos = v.replace(/\D/g, '')
    const completo = campo.tipo === 'cpf' ? digitos.length === 11 : digitos.length >= 10
    if (!completo) return null // ainda digitando — não acusa
    const ok = campo.tipo === 'cpf' ? cpfValido(v) : telefoneValido(v)
    return ok ? 'ok' : 'erro'
  }

  const msgErroCampo = (campo: CampoExtra) =>
    campo.tipo === 'cpf' ? 'CPF inválido — confira os números.' : 'Telefone inválido.'

  async function enviar(formData: FormData) {
    // Valida CPF/telefone preenchidos antes de mandar (o servidor não formata).
    for (const c of campos) {
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
      {campos.map((c) => {
        // Fixos usam o name nativo que a action lê (nome/email); extras usam extra_<id>.
        const name = c.fixo ?? `extra_${c.id}`
        return (
          <div key={c.id}>
            <label className="block text-[13px] font-semibold mb-1.5">
              {c.label}
              {c.obrigatorio && <span className="text-error"> *</span>}
            </label>
            {c.fixo === 'email' ? (
              <input
                className="input"
                name={name}
                type="email"
                placeholder="seu@email.com"
                required
              />
            ) : c.fixo === 'nome' ? (
              <input className="input" name={name} type="text" placeholder="Seu nome" required />
            ) : c.tipo === 'opcoes' ? (
              <Select name={name} opcoes={c.opcoes ?? []} required={c.obrigatorio} />
            ) : c.tipo === 'cpf' || c.tipo === 'telefone' ? (
              (() => {
                const estado = estadoCampo(c)
                const mostraErro = estado === 'erro' && tocados[c.id]
                const mostraOk = estado === 'ok'
                return (
                  <div>
                    <div className="relative">
                      <input
                        className={`input pr-10 ${
                          mostraErro
                            ? 'border-error focus:border-error focus:ring-error/20'
                            : mostraOk
                              ? 'border-success focus:border-success focus:ring-success/20'
                              : ''
                        }`}
                        name={name}
                        type="text"
                        inputMode="numeric"
                        placeholder={c.tipo === 'cpf' ? '000.000.000-00' : '(00) 00000-0000'}
                        value={mascarados[c.id] ?? ''}
                        onChange={(e) => aoDigitar(c, e.target.value)}
                        onBlur={() => setTocados((t) => ({ ...t, [c.id]: true }))}
                        required={c.obrigatorio}
                        aria-invalid={mostraErro}
                      />
                      {mostraOk && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-success" aria-hidden>
                          ✓
                        </span>
                      )}
                    </div>
                    {mostraErro && <p className="text-error text-xs mt-1">{msgErroCampo(c)}</p>}
                  </div>
                )
              })()
            ) : (
              <input
                className="input"
                name={name}
                type={c.tipo === 'numero' ? 'number' : 'text'}
                required={c.obrigatorio}
              />
            )}
          </div>
        )
      })}

      {erro && <p className="text-error text-sm">{erro}</p>}

      <Button type="submit" block disabled={enviando}>
        {enviando ? 'Enviando…' : 'Confirmar inscrição'}
      </Button>
      <p className="text-xs text-muted text-center leading-relaxed">
        Leva menos de um minuto. Seus dados vão só para a organização do evento.
        <br />
        Depois de confirmar, você escolhe as palestras e recebe o ingresso por e-mail.
      </p>
    </form>
  )
}
