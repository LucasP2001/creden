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
//
// Validação toda nossa (form noValidate): campo obrigatório vazio fica só com a
// borda vermelha; campo preenchido de forma inválida (CPF/telefone/e-mail) fica
// vermelho e mostra a mensagem inline. Nada de balão nativo do browser.
export function InscricaoForm({ slug, camposExtras }: Props) {
  const router = useRouter()
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  // Todos os campos são controlados (para saber se estão vazios). CPF/telefone
  // guardam o texto mascarado; os demais, o valor cru.
  const [valores, setValores] = useState<Record<string, string>>({})
  // Campos que o usuário já saiu (blur) ou que o submit reprovou: só aí acusamos
  // erro, para não piscar vermelho enquanto ainda está digitando.
  const [tocados, setTocados] = useState<Record<string, boolean>>({})

  // Nome e e-mail vêm na lista (fixos), na ordem escolhida pelo organizador.
  // comCamposFixos cobre eventos antigos que ainda não têm os fixos gravados.
  const campos = useMemo(() => comCamposFixos(camposExtras), [camposExtras])

  // Campos com formato validado (mostram mensagem quando inválidos).
  const temFormato = (c: CampoExtra) =>
    c.tipo === 'cpf' || c.tipo === 'telefone' || c.fixo === 'email'

  // Nome e e-mail (fixos) são sempre obrigatórios; os demais seguem a marcação.
  const ehObrigatorio = (c: CampoExtra) => !!c.fixo || !!c.obrigatorio

  function aoDigitar(campo: CampoExtra, bruto: string) {
    const v =
      campo.tipo === 'cpf'
        ? formatarCpf(bruto)
        : campo.tipo === 'telefone'
          ? formatarTelefone(bruto)
          : bruto
    setValores((m) => ({ ...m, [campo.id]: v }))
  }

  /** Formato válido de um campo preenchido. Campos sem formato próprio = sempre ok. */
  function formatoValido(campo: CampoExtra, v: string): boolean {
    if (campo.fixo === 'email') return emailValido(v)
    if (campo.tipo === 'cpf') return cpfValido(v)
    if (campo.tipo === 'telefone') return telefoneValido(v)
    return true
  }

  /**
   * Estado visual do campo:
   *  'vazio'  -> obrigatório sem valor, já tocado (só borda vermelha)
   *  'erro'   -> preenchido com formato inválido (borda + mensagem)
   *  'ok'     -> preenchido e válido (borda verde + ✓, só para campos com formato)
   *  null     -> neutro
   */
  function estadoCampo(campo: CampoExtra): 'vazio' | 'erro' | 'ok' | null {
    const v = (valores[campo.id] ?? '').trim()
    const tocado = !!tocados[campo.id]

    if (!v) return tocado && ehObrigatorio(campo) ? 'vazio' : null

    if (formatoValido(campo, v)) return temFormato(campo) ? 'ok' : null

    // Preenchido mas inválido. Enquanto não tocou, não acusa se ainda parece
    // estar no meio da digitação (número curto, e-mail sem @).
    if (!tocado) {
      if (campo.tipo === 'cpf' || campo.tipo === 'telefone') {
        const digitos = v.replace(/\D/g, '')
        const completo = campo.tipo === 'cpf' ? digitos.length === 11 : digitos.length >= 10
        if (!completo) return null
      } else if (campo.fixo === 'email' && !v.includes('@')) {
        return null
      }
    }
    return 'erro'
  }

  function msgErroCampo(campo: CampoExtra): string {
    if (campo.fixo === 'email') return 'E-mail inválido — verifique se tem "@" e domínio.'
    if (campo.tipo === 'cpf') return 'CPF inválido — confira os números.'
    return 'Telefone inválido — informe DDD e número.'
  }

  async function enviar(formData: FormData) {
    // Reprova campo obrigatório vazio e campo com formato inválido. Marca TODOS
    // os reprovados de uma vez, para que cada um acenda seu destaque.
    const reprovados: string[] = []
    for (const c of campos) {
      const valor = (valores[c.id] ?? '').trim()
      if (!valor) {
        if (ehObrigatorio(c)) reprovados.push(c.id)
        continue
      }
      if (!formatoValido(c, valor)) reprovados.push(c.id)
    }
    if (reprovados.length > 0) {
      setTocados((t) => ({ ...t, ...Object.fromEntries(reprovados.map((id) => [id, true])) }))
      setErro(null)
      return
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

  // Classe da borda conforme o estado (vazio e erro pintam vermelho igual).
  function classeBorda(estado: 'vazio' | 'erro' | 'ok' | null): string {
    if (estado === 'vazio' || estado === 'erro')
      return 'border-error focus:border-error focus:ring-error/20'
    if (estado === 'ok') return 'border-success focus:border-success focus:ring-success/20'
    return ''
  }

  return (
    <form action={enviar} noValidate className="card p-[22px] grid gap-[18px]">
      {campos.map((c) => {
        // Fixos usam o name nativo que a action lê (nome/email); extras usam extra_<id>.
        const name = c.fixo ?? `extra_${c.id}`
        const estado = estadoCampo(c)
        const tocar = () => setTocados((t) => ({ ...t, [c.id]: true }))
        return (
          <div key={c.id}>
            <label className="block text-[13px] font-semibold mb-1.5">
              {c.label}
              {ehObrigatorio(c) && <span className="text-error"> *</span>}
            </label>

            {c.tipo === 'opcoes' ? (
              <Select
                name={name}
                opcoes={c.opcoes ?? []}
                value={valores[c.id] ?? ''}
                onChange={(v) => setValores((m) => ({ ...m, [c.id]: v }))}
                onBlur={tocar}
                invalido={estado === 'vazio' || estado === 'erro'}
              />
            ) : (
              <div className="relative">
                <input
                  className={`input ${temFormato(c) ? 'pr-10' : ''} ${classeBorda(estado)}`}
                  name={name}
                  type={c.tipo === 'numero' ? 'number' : 'text'}
                  inputMode={
                    c.fixo === 'email'
                      ? 'email'
                      : c.tipo === 'cpf' || c.tipo === 'telefone'
                        ? 'numeric'
                        : undefined
                  }
                  autoCapitalize={c.fixo === 'email' ? 'none' : undefined}
                  placeholder={
                    c.fixo === 'nome'
                      ? 'Seu nome'
                      : c.fixo === 'email'
                        ? 'seu@email.com'
                        : c.tipo === 'cpf'
                          ? '000.000.000-00'
                          : c.tipo === 'telefone'
                            ? '(00) 00000-0000'
                            : undefined
                  }
                  value={valores[c.id] ?? ''}
                  onChange={(e) => aoDigitar(c, e.target.value)}
                  onBlur={tocar}
                  aria-invalid={estado === 'vazio' || estado === 'erro'}
                />
                {estado === 'ok' && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-success" aria-hidden>
                    ✓
                  </span>
                )}
              </div>
            )}

            {/* Mensagem só para formato inválido; vazio fica só com a borda. */}
            {estado === 'erro' && <p className="text-error text-xs mt-1">{msgErroCampo(c)}</p>}
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
