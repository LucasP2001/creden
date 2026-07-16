import { Dia, Sessao } from '@/types'
import { rotuloTipo } from '@/lib/sessoes'
import { formatarDiaLongo } from '@/lib/conflitos'

// Intervalo/pausa: divisória fina, não card — é respiro do cronograma, não atividade.
function LinhaIntervalo({ s }: { s: Sessao }) {
  return (
    <div className="flex items-center gap-3 py-1 min-w-0">
      <span className="text-xs text-muted tabular-nums w-12 shrink-0 text-right">
        {s.hora_inicio}
      </span>
      <span className="h-px w-4 bg-line shrink-0" />
      <span className="text-xs text-muted min-w-0 break-words">{s.titulo}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

// Card read-only de uma sessão no cronograma público.
function SessaoCard({ s, contagens }: { s: Sessao; contagens?: Record<string, number> }) {
  const usadas = contagens?.[s.id] ?? 0
  const restantes = s.vagas_max != null ? Math.max(0, s.vagas_max - usadas) : null

  return (
    <div className="card p-4 flex gap-3 items-start min-w-0">
      {/* Coluna de hora — âncora de leitura */}
      <div className="w-12 shrink-0 text-right">
        <div className="text-sm font-semibold text-secondary tabular-nums leading-tight">
          {s.hora_inicio}
        </div>
        {s.hora_fim && <div className="text-[10px] text-muted tabular-nums">{s.hora_fim}</div>}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold leading-snug break-words">{s.titulo}</div>
        <div className="mt-1 space-y-0.5">
          <div className="text-xs text-muted">
            {rotuloTipo(s)}
            {s.local && <span> · 📍 {s.local}</span>}
          </div>
          {s.palestrante && <div className="text-xs text-muted break-words">{s.palestrante}</div>}
        </div>
        {restantes != null && (
          <div
            className={`text-xs font-semibold mt-1.5 ${
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

// Cronograma read-only: dias -> (sessões soltas + categorias -> sessões).
export function Cronograma({
  dias,
  contagens,
}: {
  dias: Dia[]
  contagens?: Record<string, number>
}) {
  const lista = dias ?? []
  if (lista.length === 0) return null

  function render(s: Sessao) {
    return s.sem_inscricao ? (
      <LinhaIntervalo key={s.id} s={s} />
    ) : (
      <SessaoCard key={s.id} s={s} contagens={contagens} />
    )
  }

  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl font-semibold mb-4">Programação</h2>
      <div className="grid gap-8 min-w-0">
        {lista.map((d, i) => (
          <div key={d.id} className="min-w-0">
            <div className="flex items-baseline gap-2 pb-2 border-b border-line">
              <h3 className="font-display text-lg font-semibold text-primary">Dia {i + 1}</h3>
              {d.data && <span className="text-sm text-muted">{formatarDiaLongo(d.data)}</span>}
            </div>

            {/* Sessões soltas do dia */}
            {(d.sessoes ?? []).length > 0 && (
              <div className="grid gap-2 mt-3 min-w-0">{(d.sessoes ?? []).map(render)}</div>
            )}

            {/* Categorias do dia */}
            {(d.categorias ?? []).map((c) => (
              <div key={c.id} className="mt-4 min-w-0">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-2 break-words">
                  {c.titulo}
                </h4>
                <div className="grid gap-2 min-w-0">{(c.sessoes ?? []).map(render)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
