import { Categoria } from '@/types'
import { rotuloTipo } from '@/lib/sessoes'

function formatarDia(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function Cronograma({
  categorias,
  contagens,
}: {
  categorias: Categoria[]
  contagens?: Record<string, number>
}) {
  if (!categorias || categorias.length === 0) return null
  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl font-semibold mb-4">Programação</h2>
      <div className="grid gap-6">
        {categorias.map((c) => (
          <div key={c.id}>
            <h3 className="font-display text-lg font-semibold text-primary">{c.titulo}</h3>
            <div className="grid gap-2.5 mt-3">
              {c.sessoes.map((s) => {
                const usadas = contagens?.[s.id] ?? 0
                const lotada = s.vagas_max != null && usadas >= s.vagas_max
                return (
                  <div key={s.id} className="card p-4 flex gap-4 items-start">
                    <div className="text-sm font-semibold text-secondary whitespace-nowrap">
                      {s.dia ? `${formatarDia(s.dia)} · ` : ''}
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
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
