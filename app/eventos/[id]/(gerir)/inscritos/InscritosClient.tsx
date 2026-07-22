'use client'

import { useMemo, useState, useTransition, useRef, useEffect } from 'react'
import { Badge } from '@/components/ui/Badge'
import { FUSO_BR, formatarHora } from '@/lib/datas'
import { CampoExtra, Dia, Inscricao, InscricaoStatus } from '@/types'
import { SessaoAchatada } from '@/lib/sessoes'
import {
  marcarPresenca,
  desfazerPresenca,
  cancelarInscricao,
  reenviarBilhete,
  type AcaoResult,
} from './actions'
import { AdicionarInscritoModal } from './AdicionarInscritoModal'
import { DetalheInscritoModal } from './DetalheInscritoModal'

function hora(iso: string | null): string {
  return iso ? formatarHora(iso) : '—'
}

function dataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: FUSO_BR,
  })
}

const POR_PAGINA = 10

// Opções de filtro por status. Seleção múltipla: nenhuma marcada = todos.
const STATUS_OPCOES: { chave: InscricaoStatus; label: string }[] = [
  { chave: 'inscrito', label: 'Aguardando' },
  { chave: 'presente', label: 'Presentes' },
  { chave: 'cancelado', label: 'Cancelados' },
]

interface Props {
  eventoId: string
  inscricoes: Inscricao[]
  /** Dono/editor: pode cancelar e reenviar bilhete. */
  podeEditar: boolean
  /** Dono/editor/checkin: pode confirmar presença. */
  podeCheckin: boolean
  camposExtras: CampoExtra[]
  dias: Dia[]
  sessoes: SessaoAchatada[]
  marcacoesPorInscrito: Record<string, string[]>
}

// Tabela de inscritos com busca, filtro por status e ações por linha.
// Desktop: tabela. Mobile: lista de cards (a tabela de 6 colunas não cabe).
export function InscritosClient({
  eventoId,
  inscricoes,
  podeEditar,
  podeCheckin,
  camposExtras,
  dias,
  sessoes,
  marcacoesPorInscrito,
}: Props) {
  const [termo, setTermo] = useState('')
  // Status selecionados. Vazio = mostra todos.
  const [sel, setSel] = useState<Set<InscricaoStatus>>(new Set())
  // Sessões selecionadas no filtro. Vazio = não filtra por sessão.
  const [selSessoes, setSelSessoes] = useState<Set<string>>(new Set())
  const [filtroAberto, setFiltroAberto] = useState(false)
  // Sub-lista de sessões dentro do menu de filtro (colapsada por padrão).
  const [sessoesExpandido, setSessoesExpandido] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [adicionar, setAdicionar] = useState(false)
  const [detalhe, setDetalhe] = useState<Inscricao | null>(null)
  const filtroRef = useRef<HTMLDivElement>(null)
  useClickFora(filtroAberto, filtroRef, () => setFiltroAberto(false))

  // Zera status e sessões de uma vez (usado pelo "Limpar filtros" nos dois menus).
  function limparFiltros() {
    setSel(new Set())
    setSelSessoes(new Set())
  }

  // Contagem por status, para o menu de filtro.
  const contagem = useMemo(() => {
    const c: Record<InscricaoStatus, number> = { inscrito: 0, presente: 0, cancelado: 0 }
    for (const i of inscricoes) c[i.status]++
    return c
  }, [inscricoes])

  function alternar(status: InscricaoStatus) {
    setSel((prev) => {
      const proximo = new Set(prev)
      if (proximo.has(status)) proximo.delete(status)
      else proximo.add(status)
      return proximo
    })
  }

  function alternarSessao(id: string) {
    setSelSessoes((prev) => {
      const proximo = new Set(prev)
      if (proximo.has(id)) proximo.delete(id)
      else proximo.add(id)
      return proximo
    })
  }

  const lista = useMemo(() => {
    const q = termo.trim().toLowerCase()
    return inscricoes.filter((i) => {
      if (sel.size > 0 && !sel.has(i.status)) return false
      if (q && !i.nome.toLowerCase().includes(q) && !i.email.toLowerCase().includes(q)) return false
      if (selSessoes.size > 0) {
        const marcadas = new Set(marcacoesPorInscrito[i.id] ?? [])
        if (![...selSessoes].every((sid) => marcadas.has(sid))) return false
      }
      return true
    })
  }, [inscricoes, termo, sel, selSessoes, marcacoesPorInscrito])

  // Busca/filtro mudou → volta pra primeira página (senão fica numa página vazia).
  useEffect(() => {
    setPagina(1)
  }, [termo, sel, selSessoes])

  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const inicio = (paginaAtual - 1) * POR_PAGINA
  const visiveis = lista.slice(inicio, inicio + POR_PAGINA)

  const temAcoes = podeEditar || podeCheckin

  function mostrar(res: AcaoResult, sucesso: string) {
    if (res.ok) setAviso({ tipo: 'ok', texto: sucesso })
    else setAviso({ tipo: 'erro', texto: res.erro ?? 'Algo deu errado.' })
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <input
          className="input flex-1 sm:flex-none sm:max-w-xs"
          placeholder="Buscar por nome ou e-mail…"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
        />
        <div ref={filtroRef} className="relative shrink-0">
          <button
            onClick={() => setFiltroAberto((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={filtroAberto}
            className={`rounded-md px-3.5 py-2.5 text-sm font-medium flex items-center gap-2 border transition-colors ${
              sel.size + selSessoes.size > 0
                ? 'bg-primary text-white border-primary hover:bg-primary-hover'
                : 'bg-surface text-ink border-line hover:border-primary-light'
            }`}
          >
            {/* ícone de funil */}
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path
                d="M3 4h14l-5.5 6.5V16L8.5 14v-3.5L3 4z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <span>Filtrar</span>
            {sel.size + selSessoes.size > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-white/25 text-xs font-semibold tabular-nums">
                {sel.size + selSessoes.size}
              </span>
            )}
          </button>

          {filtroAberto && (
            <div
              role="menu"
              className="absolute right-0 top-12 z-20 w-72 max-w-[calc(100vw-2rem)] bg-surface border border-line rounded-lg shadow-lg py-1.5"
            >
              {STATUS_OPCOES.map((f) => {
                const marcado = sel.has(f.chave)
                return (
                  <button
                    key={f.chave}
                    role="menuitemcheckbox"
                    aria-checked={marcado}
                    onClick={() => alternar(f.chave)}
                    className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-3 hover:bg-sand"
                  >
                    <span
                      className={`w-[18px] h-[18px] shrink-0 rounded-[5px] border grid place-items-center transition-colors ${
                        marcado ? 'bg-primary border-primary text-white' : 'border-line bg-surface'
                      }`}
                    >
                      {marcado && (
                        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" aria-hidden>
                          <path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className={`flex-1 ${marcado ? 'text-ink font-medium' : 'text-ink'}`}>{f.label}</span>
                    <span className="text-xs text-muted tabular-nums">{contagem[f.chave]}</span>
                  </button>
                )
              })}

              {sessoes.length > 0 && (
                <>
                  <div className="h-px bg-line my-1" />
                  {/* Accordion: "Sessões" colapsado por padrão; expande a lista multi-seleção. */}
                  <button
                    onClick={() => setSessoesExpandido((v) => !v)}
                    aria-expanded={sessoesExpandido}
                    className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 hover:bg-sand"
                  >
                    <span className="flex-1 text-[11px] uppercase tracking-wide text-muted font-semibold">
                      Sessões
                    </span>
                    {selSessoes.size > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-primary text-white text-xs font-semibold tabular-nums">
                        {selSessoes.size}
                      </span>
                    )}
                    {/* chevron */}
                    <svg
                      className={`w-4 h-4 text-muted transition-transform ${sessoesExpandido ? 'rotate-180' : ''}`}
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden
                    >
                      <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {sessoesExpandido && (
                    <div className="max-h-[50vh] overflow-y-auto">
                      {sessoes.map((s) => {
                        const marcado = selSessoes.has(s.id)
                        return (
                          <button
                            key={s.id}
                            role="menuitemcheckbox"
                            aria-checked={marcado}
                            onClick={() => alternarSessao(s.id)}
                            className="w-full text-left px-3 py-2.5 text-sm flex items-start gap-3 hover:bg-sand"
                          >
                            <span
                              className={`mt-0.5 w-[18px] h-[18px] shrink-0 rounded-[5px] border grid place-items-center transition-colors ${
                                marcado ? 'bg-primary border-primary text-white' : 'border-line bg-surface'
                              }`}
                            >
                              {marcado && (
                                <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" aria-hidden>
                                  <path d="M2.5 6.5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </span>
                            <span className={`flex-1 leading-snug ${marcado ? 'text-ink font-medium' : 'text-ink'}`}>
                              {s.titulo}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              )}

              {sel.size + selSessoes.size > 0 && (
                <>
                  <div className="h-px bg-line my-1" />
                  <button
                    onClick={limparFiltros}
                    className="w-full text-left px-3 py-2 text-sm text-muted hover:bg-sand hover:text-ink"
                  >
                    Limpar filtros
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {podeEditar && (
          <button
            onClick={() => setAdicionar(true)}
            className="btn btn-primary rounded-md px-3.5 py-2.5 text-sm shrink-0 whitespace-nowrap"
          >
            + Adicionar inscrito
          </button>
        )}
      </div>

      {aviso && (
        <div
          className={`mb-4 rounded-lg px-4 py-2.5 text-sm flex items-center justify-between gap-3 ${
            aviso.tipo === 'ok' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
          }`}
        >
          <span>{aviso.texto}</span>
          <button onClick={() => setAviso(null)} className="opacity-60 hover:opacity-100" aria-label="Fechar">
            ✕
          </button>
        </div>
      )}

      {lista.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          {inscricoes.length === 0
            ? 'Nenhum inscrito ainda — compartilhe o link para começar.'
            : 'Nenhum inscrito corresponde à busca.'}
        </div>
      ) : (
        <>
          {/* Desktop: tabela */}
          <div className="card overflow-hidden hidden sm:block">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Nome', 'E-mail', 'Inscrição', 'Status', 'Check-in'].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs uppercase tracking-wide text-muted font-semibold px-4 py-3 border-b border-line"
                    >
                      {h}
                    </th>
                  ))}
                  {temAcoes && <th className="w-10 border-b border-line" aria-label="Ações" />}
                </tr>
              </thead>
              <tbody>
                {visiveis.map((i) => (
                  <Linha
                    key={i.id}
                    eventoId={eventoId}
                    inscricao={i}
                    podeEditar={podeEditar}
                    podeCheckin={podeCheckin}
                    onResultado={mostrar}
                    onAbrirDetalhe={setDetalhe}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {visiveis.map((i) => (
              <CardInscrito
                key={i.id}
                eventoId={eventoId}
                inscricao={i}
                podeEditar={podeEditar}
                podeCheckin={podeCheckin}
                onResultado={mostrar}
                onAbrirDetalhe={setDetalhe}
              />
            ))}
          </div>
        </>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted order-2 sm:order-1">
          {lista.length === inscricoes.length
            ? `${inscricoes.length} ${inscricoes.length === 1 ? 'inscrito' : 'inscritos'}`
            : `${lista.length} de ${inscricoes.length} inscritos`}
          {lista.length > POR_PAGINA &&
            ` · ${inicio + 1}–${Math.min(inicio + POR_PAGINA, lista.length)}`}
        </p>

        {totalPaginas > 1 && (
          <div className="order-1 sm:order-2 flex items-center gap-2">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={paginaAtual <= 1}
              className="flex-1 sm:flex-none rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-primary-light disabled:opacity-40 disabled:pointer-events-none"
            >
              ← Anterior
            </button>
            <span className="text-sm text-muted tabular-nums shrink-0 px-1">
              {paginaAtual} / {totalPaginas}
            </span>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaAtual >= totalPaginas}
              className="flex-1 sm:flex-none rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-primary-light disabled:opacity-40 disabled:pointer-events-none"
            >
              Próxima →
            </button>
          </div>
        )}
      </div>

      {adicionar && (
        <AdicionarInscritoModal
          eventoId={eventoId}
          camposExtras={camposExtras}
          dias={dias}
          onFechar={() => setAdicionar(false)}
          onResultado={mostrar}
        />
      )}
      {detalhe && (
        <DetalheInscritoModal
          eventoId={eventoId}
          inscricao={detalhe}
          podeEditar={podeEditar}
          podeCheckin={podeCheckin}
          onFechar={() => setDetalhe(null)}
          onResultado={mostrar}
        />
      )}
    </div>
  )
}

/** Estado + lógica das ações de uma inscrição, compartilhado por linha e card. */
function useAcoes(
  onResultado: (res: AcaoResult, sucesso: string) => void
): {
  aberto: boolean
  setAberto: (v: boolean | ((p: boolean) => boolean)) => void
  pendente: boolean
  rodar: (fn: () => Promise<AcaoResult>, sucesso: string) => void
} {
  const [aberto, setAberto] = useState(false)
  const [pendente, startTransition] = useTransition()

  function rodar(fn: () => Promise<AcaoResult>, sucesso: string) {
    setAberto(false)
    startTransition(async () => {
      const res = await fn()
      onResultado(res, sucesso)
    })
  }

  return { aberto, setAberto, pendente, rodar }
}

/** Itens do menu de ações — mesmos no desktop e no mobile. */
function itensAcao(
  eventoId: string,
  inscricao: Inscricao,
  podeEditar: boolean,
  podeCheckin: boolean,
  rodar: (fn: () => Promise<AcaoResult>, sucesso: string) => void
) {
  const cancelado = inscricao.status === 'cancelado'
  const presente = inscricao.status === 'presente'
  const itens: React.ReactNode[] = []

  if (podeCheckin && !presente && !cancelado) {
    itens.push(
      <ItemMenu key="presenca" onClick={() => rodar(() => marcarPresenca(eventoId, inscricao.id), 'Presença confirmada.')}>
        ✓ Confirmar presença
      </ItemMenu>
    )
  }
  if (podeCheckin && presente) {
    itens.push(
      <ItemMenu key="desfazer" onClick={() => rodar(() => desfazerPresenca(eventoId, inscricao.id), 'Check-in desfeito.')}>
        ↩ Desfazer check-in
      </ItemMenu>
    )
  }
  if (podeEditar && !cancelado) {
    itens.push(
      <ItemMenu key="reenviar" onClick={() => rodar(() => reenviarBilhete(eventoId, inscricao.id), 'Bilhete reenviado por e-mail.')}>
        ✉ Reenviar bilhete
      </ItemMenu>
    )
    itens.push(
      <ItemMenu key="cancelar" destrutivo onClick={() => rodar(() => cancelarInscricao(eventoId, inscricao.id), 'Inscrição cancelada.')}>
        ✕ Cancelar inscrição
      </ItemMenu>
    )
  }
  if (cancelado) {
    itens.push(
      <div key="cancelado" className="px-4 py-2.5 text-sm text-muted">
        Inscrição cancelada
      </div>
    )
  }
  return itens
}

interface AlvoProps {
  eventoId: string
  inscricao: Inscricao
  podeEditar: boolean
  podeCheckin: boolean
  onResultado: (res: AcaoResult, sucesso: string) => void
  onAbrirDetalhe: (inscricao: Inscricao) => void
}

function Linha({ eventoId, inscricao, podeEditar, podeCheckin, onResultado, onAbrirDetalhe }: AlvoProps) {
  const { aberto, setAberto, pendente, rodar } = useAcoes(onResultado)
  const menuRef = useRef<HTMLTableCellElement>(null)
  useClickFora(aberto, menuRef, () => setAberto(false))

  const temAcoes = podeEditar || podeCheckin

  return (
    <tr
      onClick={() => onAbrirDetalhe(inscricao)}
      className="border-b border-line last:border-0 hover:bg-[#faf8f3] cursor-pointer"
    >
      <td className="px-4 py-3.5 text-sm font-semibold">{inscricao.nome}</td>
      <td className="px-4 py-3.5 text-sm text-muted max-w-[220px] truncate" title={inscricao.email}>
        {inscricao.email}
      </td>
      <td className="px-4 py-3.5 text-sm text-muted">{dataHora(inscricao.created_at)}</td>
      <td className="px-4 py-3.5 text-sm">
        <Badge status={inscricao.status} />
      </td>
      <td className="px-4 py-3.5 text-sm tabular-nums">{hora(inscricao.checkin_at)}</td>
      {temAcoes && (
        <td
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className="px-2 py-3.5 text-sm relative text-right"
        >
          <BotaoMenu aberto={aberto} pendente={pendente} onToggle={() => setAberto((v) => !v)} />
          {aberto && (
            <div
              role="menu"
              className="absolute right-2 top-11 z-20 w-52 bg-surface border border-line rounded-lg shadow-lg overflow-hidden text-left"
            >
              {itensAcao(eventoId, inscricao, podeEditar, podeCheckin, rodar)}
            </div>
          )}
        </td>
      )}
    </tr>
  )
}

function CardInscrito({ eventoId, inscricao, podeEditar, podeCheckin, onResultado, onAbrirDetalhe }: AlvoProps) {
  const { aberto, setAberto, pendente, rodar } = useAcoes(onResultado)
  const menuRef = useRef<HTMLDivElement>(null)
  useClickFora(aberto, menuRef, () => setAberto(false))

  const temAcoes = podeEditar || podeCheckin
  const presente = inscricao.status === 'presente'

  return (
    <div onClick={() => onAbrirDetalhe(inscricao)} className="card p-4 cursor-pointer">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold break-words">{inscricao.nome}</p>
          <p className="text-sm text-muted truncate" title={inscricao.email}>
            {inscricao.email}
          </p>
        </div>
        {temAcoes && (
          <div ref={menuRef} onClick={(e) => e.stopPropagation()} className="relative shrink-0">
            <BotaoMenu aberto={aberto} pendente={pendente} onToggle={() => setAberto((v) => !v)} />
            {aberto && (
              <div
                role="menu"
                className="absolute right-0 top-10 z-20 w-52 bg-surface border border-line rounded-lg shadow-lg overflow-hidden text-left"
              >
                {itensAcao(eventoId, inscricao, podeEditar, podeCheckin, rodar)}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
        <Badge status={inscricao.status} />
        <span className="text-xs text-muted">
          Inscrição {dataHora(inscricao.created_at)}
          {presente && ` · entrou ${hora(inscricao.checkin_at)}`}
        </span>
      </div>
    </div>
  )
}

/** Fecha o menu ao clicar fora. */
function useClickFora(
  ativo: boolean,
  ref: React.RefObject<HTMLElement>,
  fechar: () => void
) {
  useEffect(() => {
    if (!ativo) return
    function onClickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) fechar()
    }
    document.addEventListener('mousedown', onClickFora)
    return () => document.removeEventListener('mousedown', onClickFora)
  }, [ativo, ref, fechar])
}

function BotaoMenu({
  aberto,
  pendente,
  onToggle,
}: {
  aberto: boolean
  pendente: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      disabled={pendente}
      className="w-8 h-8 rounded-md text-muted hover:bg-line/60 disabled:opacity-40"
      aria-label="Ações"
      aria-haspopup="menu"
      aria-expanded={aberto}
    >
      {pendente ? '…' : '⋯'}
    </button>
  )
}

function ItemMenu({
  children,
  onClick,
  destrutivo = false,
}: {
  children: React.ReactNode
  onClick: () => void
  destrutivo?: boolean
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#faf8f3] ${
        destrutivo ? 'text-error' : 'text-ink'
      }`}
    >
      {children}
    </button>
  )
}
