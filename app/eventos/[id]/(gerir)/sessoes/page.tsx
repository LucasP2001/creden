import { createServerSupabase } from '@/lib/supabase'
import { Evento, Sessao } from '@/types'
import { rotuloTipo, formatarDia } from '@/lib/sessoes'


// Relatório por sessão (organizador). RLS garante que só o dono lê inscricoes_sessoes.
export default async function SessoesRelatorioPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabase()

  const { data: eventoRow } = await supabase.from('eventos').select('*').eq('id', params.id).single()
  if (!eventoRow) {
    return <div className="p-8">Evento não encontrado.</div>
  }
  const ev = eventoRow as Evento
  // Defensivo: eventos antigos podem não ter dias populado.
  const dias = ev.dias ?? []

  // Contagem por sessão (apenas sessao_id). RLS restringe ao dono.
  const { data: marc } = await supabase
    .from('inscricoes_sessoes')
    .select('sessao_id')
    .eq('evento_id', ev.id)

  const contagem = new Map<string, number>()
  for (const row of (marc ?? []) as { sessao_id: string }[]) {
    contagem.set(row.sessao_id, (contagem.get(row.sessao_id) ?? 0) + 1)
  }

  return (
    <>
      <p className="text-muted -mt-2 mb-6">
        Quantas pessoas marcaram cada sessão. Os nomes ficam no detalhe de cada
        inscrito, na aba <span className="font-semibold text-ink">Gerenciamento</span>.
      </p>
      {dias.length === 0 ? (
        <p className="text-muted mt-4">Este evento não tem programação.</p>
      ) : (
        <div className="grid gap-8">
          {dias.map((d, i) => (
            <div key={d.id}>
              <h2 className="font-display text-lg font-semibold text-primary">
                {d.data ? `Dia ${i + 1} · ${formatarDia(d.data)}` : `Dia ${i + 1}`}
              </h2>
              {d.sessoes.length > 0 && (
                <div className="grid gap-3 mt-2">
                  {d.sessoes.map((s) => (
                    <SessaoRelatorio key={s.id} s={s} total={contagem.get(s.id) ?? 0} />
                  ))}
                </div>
              )}
              {d.categorias.map((c) => (
                <div key={c.id} className="mt-4">
                  <h3 className="font-semibold text-secondary">{c.titulo}</h3>
                  <div className="grid gap-3 mt-2">
                    {c.sessoes.map((s) => (
                      <SessaoRelatorio key={s.id} s={s} total={contagem.get(s.id) ?? 0} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

// Uma sessão no relatório: contagem apenas.
function SessaoRelatorio({ s, total }: { s: Sessao; total: number }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="badge badge-inscrito">{rotuloTipo(s)}</span>
        <span className="font-semibold">{s.titulo}</span>
        <span className="text-sm text-muted">
          {s.hora_inicio} · {s.vagas_max != null ? `${total} de ${s.vagas_max}` : `${total} marcações`}
        </span>
      </div>
    </div>
  )
}
