'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { CampoExtra } from '@/types'
import { comCamposFixos } from '@/lib/campos'
import {
  formatarCpf,
  formatarTelefone,
  cpfValido,
  telefoneValido,
  emailValido,
} from '@/lib/mascaras'
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
  // Valores controlados dos campos validados inline (CPF, telefone, e-mail).
  // CPF/telefone guardam o texto já mascarado; e-mail guarda o valor cru.
  const [valores, setValores] = useState<Record<string, string>>({})
  // Campos que o usuário já saiu (blur): só aí mostramos erro, pra não acusar
  // enquanto ainda está digitando.
  const [tocados, setTocados] = useState<Record<string, boolean>>({})

  // Nome e e-mail vêm na lista (fixos), na ordem escolhida pelo organizador.
  // comCamposFixos cobre eventos antigos que ainda não têm os fixos gravados.
  const campos = useMemo(() => comCamposFixos(camposExtras), [camposExtras])

  // Campos com validação inline: CPF, telefone e e-mail (fixo).
  const ehValidado = (c: CampoExtra) =>
    c.tipo === 'cpf' || c.tipo === 'telefone' || c.fixo === 'email'

  function aoDigitar(campo: CampoExtra, bruto: string) {
    const v =
      campo.tipo === 'cpf'
        ? formatarCpf(bruto)
        : campo.tipo === 'telefone'
          ? formatarTelefone(bruto)
          : bruto // e-mail: sem máscara
    setValores((m) => ({ ...m, [campo.id]: v }))
  }

  function valido(campo: CampoExtra, v: string): boolean {
    if (campo.fixo === 'email') return emailValido(v)
    if (campo.tipo === 'cpf') return cpfValido(v)
    return telefoneValido(v)
  }

  /** Estado de validação: 'ok' | 'erro' | null (vazio/ainda digitando). */
  function estadoCampo(campo: CampoExtra): 'ok' | 'erro' | null {
    const v = (valores[campo.id] ?? '').trim()
    if (!v) return null
    // Enquanto incompleto não acusa erro (só depois de "parecer" completo).
    if (campo.tipo === 'cpf' || campo.tipo === 'telefone') {
      const digitos = v.replace(/\D/g, '')
      const completo = campo.tipo === 'cpf' ? digitos.length === 11 : digitos.length >= 10
      if (!completo) return null
    } else if (campo.fixo === 'email') {
      // E-mail: só acusa depois que o usuário incluiu um '@' (senão pisca cedo demais).
      if (!v.includes('@')) return null
    }
    return valido(campo, v) ? 'ok' : 'erro'
  }

  const msgErroCampo = (campo: CampoExtra) =>
    campo.fixo === 'email'
      ? 'E-mail inválido — verifique se tem "@" e domínio.'
      : campo.tipo === 'cpf'
        ? 'CPF inválido — confira os números.'
        : 'Telefone inválido.'

  async function enviar(formData: FormData) {
    // Valida os campos inline antes de mandar; marca como tocado e acusa o
    // primeiro inválido pelo próprio destaque inline (sem mensagem genérica).
    for (const c of campos) {
      if (!ehValidado(c)) continue
      // E-mail (fixo) é sempre obrigatório; os demais seguem a marcação.
      const obrigatorio = c.fixo === 'email' || c.obrigatorio
      const valor = (valores[c.id] ?? '').trim()
      if (!valor && !obrigatorio) continue
      if (!valor || !valido(c, valor)) {
        setTocados((t) => ({ ...t, [c.id]: true }))
        setErro(null)
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
            {c.fixo === 'nome' ? (
              <input className="input" name={name} type="text" placeholder="Seu nome" required />
            ) : c.tipo === 'opcoes' ? (
              <Select name={name} opcoes={c.opcoes ?? []} required={c.obrigatorio} />
            ) : ehValidado(c) ? (
              (() => {
                const ehEmail = c.fixo === 'email'
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
                        // E-mail como 'text' (não 'email') para o browser não
                        // sobrepor o nosso balão de validação; inputMode traz o
                        // teclado certo no celular.
                        type="text"
                        inputMode={ehEmail ? 'email' : 'numeric'}
                        autoCapitalize={ehEmail ? 'none' : undefined}
                        placeholder={
                          ehEmail
                            ? 'seu@email.com'
                            : c.tipo === 'cpf'
                              ? '000.000.000-00'
                              : '(00) 00000-0000'
                        }
                        value={valores[c.id] ?? ''}
                        onChange={(e) => aoDigitar(c, e.target.value)}
                        onBlur={() => setTocados((t) => ({ ...t, [c.id]: true }))}
                        // E-mail não usa required nativo (o balão do browser
                        // conflitaria com o nosso); a validação abaixo cobre vazio.
                        required={ehEmail ? undefined : c.obrigatorio}
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
