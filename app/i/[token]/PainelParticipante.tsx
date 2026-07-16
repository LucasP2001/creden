'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { Dia, Sessao } from '@/types'
import { rotuloTipo } from '@/lib/sessoes'
import { sessoesEmConflito, sessoesDoDia, formatarDiaLongo } from '@/lib/conflitos'
import { diasSelecionaveis, contarSelecionaveis } from '@/lib/abas'
import { Abas, type AbaId } from './Abas'
import { atualizarSessoes } from './actions'

interface Props {
  token: string
  dias: Dia[]
  marcadasIniciais: string[]
  contagens: Record<string, number>
  nomeEvento: string
  /** Cronograma completo (read-only), renderizado no servidor. */
  programacao: ReactNode
  /** Card do ingresso com QR, renderizado no servidor. */
  ingresso: ReactNode
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

      {/* Indicador de seleção — 24px, dentro do alvo de 56px do card.
          Vazio precisa de borda visível, senão o card não parece marcável. */}
      <div
        aria-hidden
        className={`w-6 h-6 shrink-0 self-center rounded-lg border-2 grid place-items-center text-white text-xs font-bold ${
          marcada ? 'bg-primary border-primary' : 'border-muted/50 bg-white'
        }`}
      >
        {marcada ? '✓' : ''}
      </div>
    </label>
  )
}

// Página do participante em abas: Inscrição (o que dá pra marcar), Programação
// (cronograma completo) e Ingresso (QR). O estado das marcações vive aqui porque
// alimenta o selo da aba e a barra de salvar.
export function PainelParticipante({
  token,
  dias,
  marcadasIniciais,
  contagens,
  nomeEvento,
  programacao,
  ingresso,
}: Props) {
  const [marcadas, setMarcadas] = useState<string[]>(marcadasIniciais)
  // O que está gravado no banco. Comparar com `marcadas` diz se há algo a salvar —
  // marcar e desmarcar a mesma sessão não deve pedir salvamento.
  const [salvas, setSalvas] = useState<string[]>(marcadasIniciais)
  const [estado, setEstado] = useState<Estado>('limpo')
  const [msg, setMsg] = useState<string | null>(null)
  const [aba, setAba] = useState<AbaId>('inscricao')

  const conflitos = useMemo(() => sessoesEmConflito(dias, marcadas), [dias, marcadas])

  // Aba Inscrição: só o que dá pra escolher, mantendo os intervalos que separam
  // duas marcáveis (a noção de tempo do dia).
  const diasMarcaveis = useMemo(() => diasSelecionaveis(dias), [dias])
  const totalSelecionaveis = useMemo(() => contarSelecionaveis(dias), [dias])

  const sujo = useMemo(() => {
    if (marcadas.length !== salvas.length) return true
    const gravadas = new Set(salvas)
    return marcadas.some((id) => !gravadas.has(id))
  }, [marcadas, salvas])

  function toggle(id: string, on: boolean) {
    setMarcadas((m) => (on ? [...m, id] : m.filter((x) => x !== id)))
    setEstado('pendente')
    setMsg(null)
  }

  async function salvar() {
    setEstado('salvando')
    setMsg(null)
    const enviadas = marcadas
    const res = await atualizarSessoes(token, enviadas)
    if (res.ok) {
      setSalvas(enviadas)
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

  const conteudoInscricao = (
    <div className="card p-5 sm:p-6 pb-8 min-w-0">
      {/* Status: em zero convida à ação; com marcações, confirma o que está feito. */}
      <div className="flex items-baseline justify-between gap-3 pb-3 mb-1 border-b border-line">
        {marcadas.length === 0 ? (
          <span className="text-sm font-semibold text-primary">
            👇 Toque nas palestras que você quer assistir
          </span>
        ) : (
          <span className="text-sm font-semibold text-secondary">
            {sujo ? '' : '✓ '}
            {marcadas.length} {marcadas.length === 1 ? 'palestra marcada' : 'palestras marcadas'}
            <span className="font-normal text-muted"> de {totalSelecionaveis}</span>
          </span>
        )}
        {conflitos.size > 0 && (
          <span className="text-xs font-semibold text-warning shrink-0">
            ⚠ {conflitos.size} em choque
          </span>
        )}
      </div>

      {diasMarcaveis.length === 0 ? (
        <p className="text-sm text-muted mt-4">
          Este evento não tem sessões com inscrição — é só chegar. Veja tudo na aba Programação.
        </p>
      ) : (
        <div className="grid gap-6 mt-4 min-w-0">
          {diasMarcaveis.map((d, i) => (
            <div key={d.id} className="min-w-0">
              {/* Header do dia — gruda abaixo da barra de abas */}
              <div className="sticky top-[86px] z-10 -mx-1 px-1 py-2 bg-surface/95 backdrop-blur border-b border-line">
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
      )}

      {msg && (
        <p className={`text-xs mt-4 ${estado === 'erro' ? 'text-error' : 'text-warning'}`}>{msg}</p>
      )}
    </div>
  )

  return (
    <Abas
      nomeEvento={nomeEvento}
      ativa={aba}
      onTrocar={setAba}
      selo={totalSelecionaveis > 0 ? `${marcadas.length}/${totalSelecionaveis}` : undefined}
    >
      <div hidden={aba !== 'inscricao'}>{conteudoInscricao}</div>
      <div hidden={aba !== 'programacao'}>{programacao}</div>
      <div hidden={aba !== 'ingresso'}>{ingresso}</div>

      {/* Barra de salvar — só na aba Inscrição, e só quando há de fato o que salvar
          (ou logo após salvar, para confirmar). */}
      {aba === 'inscricao' && (sujo || estado === 'salvo' || estado === 'salvando') && (
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
    </Abas>
  )
}
