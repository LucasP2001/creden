'use client'

import { useMemo, useState, useTransition } from 'react'
import { Select } from '@/components/ui/Select'
import { CampoExtra, Dia } from '@/types'
import { comCamposFixos } from '@/lib/campos'
import { formatarCpf, formatarTelefone, cpfValido, telefoneValido, emailValido } from '@/lib/mascaras'
import { todasSessoes, rotuloTipo } from '@/lib/sessoes'
import { adicionarInscrito, type AcaoResult } from './actions'

interface AdicionarProps {
  eventoId: string
  camposExtras: CampoExtra[]
  dias: Dia[]
  onFechar: () => void
  onResultado: (res: AcaoResult & { aviso?: string }, sucesso: string) => void
}

export function AdicionarInscritoModal({ eventoId, camposExtras, dias, onFechar, onResultado }: AdicionarProps) {
  const campos = useMemo(() => comCamposFixos(camposExtras), [camposExtras])
  const sessoes = useMemo(() => todasSessoes(dias).filter((s) => !s.sem_inscricao), [dias])

  const [etapa, setEtapa] = useState<1 | 2>(1)
  const [valores, setValores] = useState<Record<string, string>>({})
  const [tocados, setTocados] = useState<Record<string, boolean>>({})
  const [erro, setErro] = useState<string | null>(null)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [pendente, startTransition] = useTransition()

  const ehObrigatorio = (c: CampoExtra) => !!c.fixo || !!c.obrigatorio

  function formatoValido(c: CampoExtra, v: string): boolean {
    if (c.fixo === 'email') return emailValido(v)
    if (c.tipo === 'cpf') return cpfValido(v)
    if (c.tipo === 'telefone') return telefoneValido(v)
    return true
  }

  function aoDigitar(c: CampoExtra, bruto: string) {
    const v = c.tipo === 'cpf' ? formatarCpf(bruto) : c.tipo === 'telefone' ? formatarTelefone(bruto) : bruto
    setValores((m) => ({ ...m, [c.id]: v }))
  }

  function validarEtapa1(): boolean {
    const reprovados: string[] = []
    for (const c of campos) {
      const v = (valores[c.id] ?? '').trim()
      if (!v) { if (ehObrigatorio(c)) reprovados.push(c.id); continue }
      if (!formatoValido(c, v)) reprovados.push(c.id)
    }
    if (reprovados.length > 0) {
      setTocados((t) => ({ ...t, ...Object.fromEntries(reprovados.map((id) => [id, true])) }))
      return false
    }
    return true
  }

  function continuar() {
    if (!validarEtapa1()) return
    if (sessoes.length === 0) { submeter(); return }
    setEtapa(2)
  }

  function toggleSessao(id: string) {
    setSel((prev) => {
      const p = new Set(prev)
      if (p.has(id)) p.delete(id); else p.add(id)
      return p
    })
  }

  function submeter() {
    const fd = new FormData()
    for (const c of campos) {
      const name = c.fixo ?? `extra_${c.id}`
      fd.append(name, (valores[c.id] ?? '').trim())
    }
    setErro(null)
    startTransition(async () => {
      const res = await adicionarInscrito(eventoId, fd, [...sel])
      if (res.ok) {
        onResultado(res, res.aviso ?? 'Inscrito adicionado e bilhete enviado.')
        onFechar()
      } else {
        setErro(res.erro ?? 'Não foi possível adicionar.')
        setEtapa(1) // erros de dados/duplicado voltam pra etapa 1
      }
    })
  }

  const invalido = (c: CampoExtra): boolean => {
    const v = (valores[c.id] ?? '').trim()
    const tocado = !!tocados[c.id]
    if (!v) return tocado && ehObrigatorio(c)
    return tocado && !formatoValido(c, v)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4" onClick={onFechar}>
      <div className="bg-surface text-ink w-full max-w-lg rounded-lg mt-[8vh] max-h-[82vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-line flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">
            Adicionar inscrito {sessoes.length > 0 && <span className="text-sm text-muted font-normal">· Etapa {etapa}/2</span>}
          </h2>
          <button onClick={onFechar} className="text-muted px-2 text-lg" aria-label="Fechar">✕</button>
        </div>

        {etapa === 1 && (
          <div className="p-5 grid gap-4">
            {campos.map((c) => (
              <div key={c.id}>
                <label className="block text-[13px] font-semibold mb-1.5">
                  {c.label}{ehObrigatorio(c) && <span className="text-error"> *</span>}
                </label>
                {c.tipo === 'opcoes' ? (
                  <Select
                    name={`extra_${c.id}`}
                    opcoes={c.opcoes ?? []}
                    value={valores[c.id] ?? ''}
                    onChange={(v) => setValores((m) => ({ ...m, [c.id]: v }))}
                    onBlur={() => setTocados((t) => ({ ...t, [c.id]: true }))}
                    invalido={invalido(c)}
                  />
                ) : (
                  <input
                    className={`input ${invalido(c) ? 'border-error focus:border-error focus:ring-error/20' : ''}`}
                    type={c.tipo === 'numero' ? 'number' : 'text'}
                    inputMode={c.fixo === 'email' ? 'email' : c.tipo === 'cpf' || c.tipo === 'telefone' ? 'numeric' : undefined}
                    autoCapitalize={c.fixo === 'email' ? 'none' : undefined}
                    placeholder={c.fixo === 'nome' ? 'Nome completo' : c.fixo === 'email' ? 'email@exemplo.com'
                      : c.tipo === 'cpf' ? '000.000.000-00' : c.tipo === 'telefone' ? '(00) 00000-0000' : undefined}
                    value={valores[c.id] ?? ''}
                    onChange={(e) => aoDigitar(c, e.target.value)}
                    onBlur={() => setTocados((t) => ({ ...t, [c.id]: true }))}
                    aria-invalid={invalido(c)}
                  />
                )}
              </div>
            ))}
            {erro && <p className="text-error text-sm">{erro}</p>}
            <button onClick={continuar} disabled={pendente} className="btn btn-primary disabled:opacity-40">
              {sessoes.length > 0 ? 'Continuar' : pendente ? 'Adicionando…' : 'Adicionar inscrito'}
            </button>
          </div>
        )}

        {etapa === 2 && (
          <div className="p-5 grid gap-3">
            <p className="text-sm text-muted">Marque as sessões que a pessoa vai participar.</p>
            {sessoes.map((s) => (
              <label key={s.id} className="card p-3 flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={sel.has(s.id)} onChange={() => toggleSessao(s.id)} className="w-4 h-4" />
                <span className="flex-1">
                  <span className="badge badge-inscrito mr-2">{rotuloTipo(s)}</span>
                  <span className="font-medium">{s.titulo}</span>
                  <span className="text-sm text-muted ml-2">{s.hora_inicio}</span>
                </span>
              </label>
            ))}
            {erro && <p className="text-error text-sm">{erro}</p>}
            <div className="flex gap-2 mt-1">
              <button onClick={() => setEtapa(1)} disabled={pendente} className="btn-ghost rounded-md px-4 py-2 text-sm">← Voltar</button>
              <button onClick={submeter} disabled={pendente} className="btn btn-primary flex-1 disabled:opacity-40">
                {pendente ? 'Adicionando…' : 'Adicionar inscrito'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
