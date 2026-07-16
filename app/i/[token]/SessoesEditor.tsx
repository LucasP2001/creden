'use client'

import { useMemo, useState } from 'react'
import { Dia, Sessao } from '@/types'
import { rotuloTipo } from '@/lib/sessoes'
import { sessoesEmConflito, sessoesDoDia, formatarDiaLongo } from '@/lib/conflitos'
import { atualizarSessoes } from './actions'

interface Props {
  token: string
  dias: Dia[]
  marcadasIniciais: string[]
  contagens: Record<string, number>
}

type Estado = 'limpo' | 'pendente' | 'salvando' | 'salvo' | 'erro'

// Linha de intervalo/pausa: informativo, sem checkbox e sem card.
function LinhaIntervalo({ s }: { s: Sessao }) {
  return (
    <div className="flex items-center gap-3 py-1.5 pl-1 min-w-0">
      <span className="text-xs text-muted tabular-nums w-11 shrink-0">{s.hora_inicio}</span>
      <span className="h-px w-4 bg-line shrink-0" />
      <span className="text-xs text-muted min-w-0 break-words">{s.titulo}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

// Card de sessão selecionável. O card inteiro é o alvo de toque.
function CardSessao({
  s,
  marcada,
  lotada,
  emConflito,
  usadas,
  onToggle,
}: {
  s: Sessao
  marcada: boolean
  lotada: boolean
  emConflito: boolean
  usadas: number
  onToggle: (on: boolean) => void
}) {
  const restantes = s.vagas_max != null ? Math.max(0, s.vagas_max - usadas) : null
  const desabilitada = lotada && !marcada

  return (
    <label
      className={`flex gap-3 p-3 rounded-2xl border transition-colors min-h-[56px] ${
        desabilitada
          ? 'border-line bg-surface opacity-55 cursor-not-allowed'
          : marcada
            ? 'border-primary bg-status-inscrito-bg cursor-pointer'
            : 'border-line bg-surface hover:border-primary/40 cursor-pointer'
      }`}
    >
      <input
        type="checkbox"
        className="sr-only"
        disabled={desabilitada}
        checked={marcada}
        onChange={(e) => onToggle(e.target.checked)}
      />

      {/* Coluna de hora — âncora de leitura da timeline */}
      <div className="w-11 shrink-0 text-center">
        <div className="text-sm font-semibold text-secondary tabular-nums leading-tight">
          {s.hora_inicio}
        </div>
        {s.hora_fim && <div className="text-[10px] text-muted tabular-nums">{s.hora_fim}</div>}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold leading-snug break-words">{s.titulo}</div>
        <div className="mt-1 space-y-0.5">
          <div className="text-[11px] text-muted">
            {rotuloTipo(s)}
            {s.local && <span> · 📍 {s.local}</span>}
          </div>
          {s.palestrante && (
            <div className="text-[11px] text-muted break-words">{s.palestrante}</div>
          )}
        </div>

        {(restantes != null || emConflito) && (
          <div className="flex items-center gap-2 flex-wrap mt-1.5">
            {restantes != null && (
              <span
                className={`text-[11px] font-semibold ${
                  restantes === 0 ? 'text-error' : restantes <= 5 ? 'text-warning' : 'text-muted'
                }`}
              >
                {restantes === 0
                  ? 'Vagas esgotadas'
                  : `${restantes} ${restantes === 1 ? 'vaga restante' : 'vagas restantes'}`}
              </span>
            )}
            {emConflito && (
              <span className="text-[11px] font-semibold text-warning">
                ⚠ Choca com outra marcada
              </span>
            )}
          </div>
        )}
      </div>

      {/* Indicador de seleção — 24px, dentro do alvo de 56px do card */}
      <div
        aria-hidden
        className={`w-6 h-6 shrink-0 self-center rounded-lg border-2 grid place-items-center text-white text-xs font-bold ${
          marcada ? 'bg-primary border-primary' : 'border-line'
        }`}
      >
        {marcada ? '✓' : ''}
      </div>
    </label>
  )
}

// Editor de marcações de sessão na página do participante. Salva via server action.
export function SessoesEditor({ token, dias, marcadasIniciais, contagens }: Props) {
  const [marcadas, setMarcadas] = useState<string[]>(marcadasIniciais)
  const [estado, setEstado] = useState<Estado>('limpo')
  const [msg, setMsg] = useState<string | null>(null)

  const conflitos = useMemo(() => sessoesEmConflito(dias, marcadas), [dias, marcadas])

  const selecionaveis = useMemo(
    () => (dias ?? []).flatMap((d) => sessoesDoDia(d)).filter((s) => !s.sem_inscricao),
    [dias]
  )

  if (!dias || dias.length === 0) return null

  function toggle(id: string, on: boolean) {
    setMarcadas((m) => (on ? [...m, id] : m.filter((x) => x !== id)))
    setEstado('pendente')
    setMsg(null)
  }

  async function salvar() {
    setEstado('salvando')
    setMsg(null)
    const res = await atualizarSessoes(token, marcadas)
    if (res.ok) {
      setEstado('salvo')
      setMsg(res.aviso ?? null)
    } else {
      setEstado('erro')
      setMsg(res.erro ?? 'Erro ao salvar.')
    }
  }

  function renderSessao(s: Sessao) {
    if (s.sem_inscricao) return <LinhaIntervalo key={s.id} s={s} />
    const marcada = marcadas.includes(s.id)
    const usadas = contagens[s.id] ?? 0
    return (
      <CardSessao
        key={s.id}
        s={s}
        marcada={marcada}
        lotada={s.vagas_max != null && usadas >= s.vagas_max}
        emConflito={conflitos.has(s.id)}
        usadas={usadas}
        onToggle={(on) => toggle(s.id, on)}
      />
    )
  }

  return (
    <div>
      {/* Contador */}
      <div className="flex items-baseline justify-between gap-3 pb-3 mb-1 border-b border-line">
        <span className="text-sm font-semibold text-secondary">
          {marcadas.length} de {selecionaveis.length} marcadas
        </span>
        {conflitos.size > 0 && (
          <span className="text-xs font-semibold text-warning">
            ⚠ {conflitos.size} em choque de horário
          </span>
        )}
      </div>

      <div className="grid gap-6 mt-4 min-w-0">
        {dias.map((d, i) => (
          <div key={d.id} className="min-w-0">
            {/* Header do dia — gruda no topo enquanto rola o dia */}
            <div className="sticky top-0 z-10 -mx-1 px-1 py-2 bg-surface/95 backdrop-blur border-b border-line">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-base font-semibold text-primary">
                  Dia {i + 1}
                </span>
                {d.data && <span className="text-xs text-muted">{formatarDiaLongo(d.data)}</span>}
              </div>
            </div>

            {/* Sessões soltas do dia */}
            {(d.sessoes ?? []).length > 0 && (
              <div className="grid gap-2 mt-3 min-w-0">{(d.sessoes ?? []).map(renderSessao)}</div>
            )}

            {/* Categorias do dia */}
            {(d.categorias ?? []).map((c) => (
              <div key={c.id} className="mt-4 min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-2 break-words">
                  {c.titulo}
                </div>
                <div className="grid gap-2 min-w-0">{(c.sessoes ?? []).map(renderSessao)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {msg && (
        <p className={`text-xs mt-4 ${estado === 'erro' ? 'text-error' : 'text-warning'}`}>{msg}</p>
      )}

      {/* Barra de salvar — fixa no rodapé só quando há mudança pendente */}
      {estado !== 'limpo' && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur border-t border-line">
          <div className="max-w-[980px] mx-auto px-5 py-3 flex items-center justify-between gap-4">
            <span className="text-sm">
              {estado === 'salvo' ? (
                <span className="font-semibold text-success">✓ Alterações salvas</span>
              ) : estado === 'erro' ? (
                <span className="font-semibold text-error">Não foi possível salvar</span>
              ) : (
                <span className="text-muted">Você tem alterações não salvas</span>
              )}
            </span>
            {estado !== 'salvo' && (
              <button
                type="button"
                onClick={salvar}
                disabled={estado === 'salvando'}
                className="btn btn-accent"
              >
                {estado === 'salvando' ? 'Salvando…' : 'Salvar alterações'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
