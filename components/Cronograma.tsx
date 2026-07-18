import { Dia, Sessao } from '@/types'
import { rotuloTipo } from '@/lib/sessoes'
import { formatarDiaLongo } from '@/lib/conflitos'

interface ItemProps {
  s: Sessao
  contagens?: Record<string, number>
  marcada?: boolean
}

/**
 * Um ponto na linha do tempo. Intervalo é só um respiro do dia — texto apagado,
 * sem ponto cheio. Aqui se corre o olho; quem escolhe é a aba Inscrição.
 */
function ItemTimeline({ s, contagens, marcada = false }: ItemProps) {
  const usadas = contagens?.[s.id] ?? 0
  const restantes = s.vagas_max != null ? Math.max(0, s.vagas_max - usadas) : null
  // Pausa = respiro do dia (intervalo, café): só hora + nome apagado. Um serviço
  // aberto a todos também é sem_inscricao, mas tem conteúdo (local, o que oferece)
  // e merece o layout completo — só não entra a parte de vagas/marcação.
  const pausa = s.sem_inscricao && s.tipo !== 'servico'

  if (pausa) {
    return (
      <div className="relative flex gap-3 min-w-0 py-2">
        <div className="w-12 shrink-0 text-right">
          <span className="text-xs text-muted tabular-nums">{s.hora_inicio}</span>
        </div>
        {/* Vaza sobre o trilho para "cortar" a linha: pausa é lacuna no dia.
            A cor vem do fundo do contexto (card claro ou página) — fixá-la deixava
            um retângulo visível na página pública. */}
        <div className="w-3 shrink-0 grid place-items-center bg-[var(--fundo-timeline)]" aria-hidden>
          <span className="w-1.5 h-1.5 rounded-full border border-line bg-[var(--fundo-timeline)]" />
        </div>
        <div className="flex-1 min-w-0 text-xs text-muted italic break-words self-center">
          {s.titulo}
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex gap-3 min-w-0 py-2.5">
      {/* Hora — âncora de leitura da agenda */}
      <div className="w-12 shrink-0 text-right">
        <div className="text-sm font-bold text-secondary tabular-nums leading-none">
          {s.hora_inicio}
        </div>
        {s.hora_fim && (
          <div className="text-[10px] text-muted tabular-nums mt-0.5">até {s.hora_fim}</div>
        )}
      </div>

      {/* Marcador — o halo abre espaço no trilho contínuo. A cor vem do fundo do
          contexto: fixá-la deixava um halo claro errado na página pública. */}
      <div className="w-3 shrink-0 flex justify-center pt-0.5" aria-hidden>
        <span
          className={`w-2.5 h-2.5 rounded-full shrink-0 ring-4 ${
            marcada
              ? 'bg-primary ring-status-inscrito-bg'
              : 'bg-line ring-[var(--fundo-timeline)]'
          }`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[15px] font-semibold leading-snug break-words">{s.titulo}</span>
          {marcada && (
            <span className="text-[10px] font-bold text-primary bg-status-inscrito-bg px-1.5 py-0.5 rounded-pill shrink-0">
              VOCÊ VAI
            </span>
          )}
        </div>
        <div className="text-xs text-muted mt-0.5">
          {rotuloTipo(s)}
          {s.local && <span> · {s.local}</span>}
        </div>
        {s.palestrante && (
          <div className="text-xs text-muted/80 mt-0.5 break-words">{s.palestrante}</div>
        )}
        {restantes != null && (
          <div
            className={`text-xs font-semibold mt-1 ${
              restantes === 0 ? 'text-error' : restantes <= 5 ? 'text-warning' : 'text-muted'
            }`}
          >
            {restantes === 0
              ? 'Vagas esgotadas'
              : `${restantes} ${restantes === 1 ? 'vaga restante' : 'vagas restantes'}`}
          </div>
        )}
      </div>
    </div>
  )
}

/** Trilha de um bloco de sessões: uma única linha vertical atrás dos itens. */
function Trilha({
  sessoes,
  contagens,
  marcadas,
}: {
  sessoes: Sessao[]
  contagens?: Record<string, number>
  marcadas: Set<string>
}) {
  if (sessoes.length === 0) return null
  return (
    <div className="relative min-w-0">
      {/* Uma linha só, do primeiro ao último ponto — é ela que mostra o fluxo do
          dia. Antes cada item desenhava seu pedaço e o resultado era pontilhado.
          A posição deriva das colunas do item (hora w-12 + gap-3 + metade do
          marcador w-3), não de um pixel chutado. */}
      <span
        aria-hidden
        className="absolute top-5 bottom-5 w-px bg-line"
        style={{ left: 'calc(3rem + 0.75rem + 0.375rem)' }}
      />
      {sessoes.map((s) => (
        <ItemTimeline key={s.id} s={s} contagens={contagens} marcada={marcadas.has(s.id)} />
      ))}
    </div>
  )
}

/**
 * Cronograma read-only como linha do tempo: dias -> (sessões soltas + categorias).
 * É para correr o olho pelo dia — quem escolhe é a aba Inscrição, com cards.
 */
export function Cronograma({
  dias,
  contagens,
  marcadas,
  semTitulo = false,
  fundo = 'sand',
}: {
  dias: Dia[]
  contagens?: Record<string, number>
  /** Ids marcados pelo participante — destaca o dia dele dentro do evento. */
  marcadas?: string[]
  /** Dentro de uma aba já chamada "Programação" o título vira eco — omite. */
  semTitulo?: boolean
  /**
   * Cor do fundo onde a timeline está: os marcadores a usam para abrir espaço no
   * trilho. Default = a página (`sand`); dentro de um card, passe `surface`.
   */
  fundo?: 'sand' | 'surface'
}) {
  const lista = dias ?? []
  if (lista.length === 0) return null
  const marcadasSet = new Set(marcadas ?? [])

  return (
    <section
      className={semTitulo ? '' : 'mt-8'}
      style={
        {
          '--fundo-timeline': fundo === 'surface' ? '#FBF8F1' : '#F4F1EA',
        } as React.CSSProperties
      }
    >
      {!semTitulo && <h2 className="font-display text-2xl font-semibold mb-4">Programação</h2>}
      <div className="grid gap-7 min-w-0">
        {lista.map((d, i) => (
          <div key={d.id} className="min-w-0">
            <div className="flex items-baseline gap-2 pb-2 mb-1 border-b border-line">
              <h3 className="font-display text-lg font-semibold text-primary">Dia {i + 1}</h3>
              {d.data && <span className="text-sm text-muted">{formatarDiaLongo(d.data)}</span>}
            </div>

            {/* Sessões soltas do dia */}
            <Trilha sessoes={d.sessoes ?? []} contagens={contagens} marcadas={marcadasSet} />

            {/* Categorias do dia */}
            {(d.categorias ?? []).map((c) => (
              <div key={c.id} className="mt-3 min-w-0">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-1 break-words">
                  {c.titulo}
                </h4>
                <Trilha sessoes={c.sessoes ?? []} contagens={contagens} marcadas={marcadasSet} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
