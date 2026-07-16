import { Dia, Sessao } from '@/types'
import { rotuloTipo, formatarDia } from '@/lib/sessoes'

// Card read-only de uma sessão no cronograma público.
function SessaoCard({ s, contagens }: { s: Sessao; contagens?: Record<string, number> }) {
  const usadas = contagens?.[s.id] ?? 0
  const lotada = s.vagas_max != null && usadas >= s.vagas_max
  return (
    <div className="card p-4 flex gap-4 items-start">
      <div className="text-sm font-semibold text-secondary whitespace-nowrap">
        {s.hora_inicio}
        {s.hora_fim ? `–${s.hora_fim}` : ''}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="badge badge-inscrito">{rotuloTipo(s)}</span>
          {s.vagas_max != null && (
            <span className={`text-xs ${lotada ? 'text-error' : 'text-muted'}`}>
              {lotada ? 'Vagas esgotadas' : `${usadas} de ${s.vagas_max} vagas`}
            </span>
          )}
        </div>
        <div className="font-semibold mt-1">{s.titulo}</div>
        {s.palestrante && <div className="text-sm text-muted">{s.palestrante}</div>}
        {s.local && <div className="text-xs text-muted">📍 {s.local}</div>}
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

  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl font-semibold mb-4">Programação</h2>
      <div className="grid gap-8">
        {lista.map((d, i) => (
          <div key={d.id}>
            <h3 className="font-display text-lg font-semibold text-primary">
              {d.data ? `Dia ${i + 1} · ${formatarDia(d.data)}` : `Dia ${i + 1}`}
            </h3>

            {/* Sessões soltas do dia */}
            {d.sessoes.length > 0 && (
              <div className="grid gap-2.5 mt-3">
                {d.sessoes.map((s) => (
                  <SessaoCard key={s.id} s={s} contagens={contagens} />
                ))}
              </div>
            )}

            {/* Categorias do dia */}
            {d.categorias.map((c) => (
              <div key={c.id} className="mt-4">
                <h4 className="font-semibold text-secondary">{c.titulo}</h4>
                <div className="grid gap-2.5 mt-2">
                  {c.sessoes.map((s) => (
                    <SessaoCard key={s.id} s={s} contagens={contagens} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
