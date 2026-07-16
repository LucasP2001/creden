import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase'
import { Evento } from '@/types'
import { agruparPorDia, rotuloTipo } from '@/lib/sessoes'

// Relatório por sessão (organizador). RLS garante que só o dono lê inscricoes_sessoes.
export default async function SessoesRelatorioPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabase()

  const { data: eventoRow } = await supabase.from('eventos').select('*').eq('id', params.id).single()
  if (!eventoRow) {
    return <div className="p-8">Evento não encontrado.</div>
  }
  const ev = eventoRow as Evento

  // Marcações + inscrito (join). RLS restringe ao dono.
  const { data: marc } = await supabase
    .from('inscricoes_sessoes')
    .select('sessao_id, inscricoes(nome, email)')
    .eq('evento_id', ev.id)

  const porSessao = new Map<string, { nome: string; email: string }[]>()
  for (const row of (marc ?? []) as unknown as {
    sessao_id: string
    inscricoes: { nome: string; email: string } | null
  }[]) {
    if (!row.inscricoes) continue
    const arr = porSessao.get(row.sessao_id) ?? []
    arr.push(row.inscricoes)
    porSessao.set(row.sessao_id, arr)
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      <Link href="/dashboard" className="text-sm text-primary hover:underline">← Voltar</Link>
      <h1 className="font-display text-3xl font-semibold mt-2">Sessões — {ev.nome}</h1>
      {ev.sessoes.length === 0 ? (
        <p className="text-muted mt-4">Este evento não tem programação.</p>
      ) : (
        <div className="grid gap-6 mt-6">
          {agruparPorDia(ev.sessoes).map((g) => (
            <div key={g.dia}>
              <h2 className="font-display text-lg font-semibold text-primary">{g.dia}</h2>
              <div className="grid gap-3 mt-2">
                {g.itens.map((s) => {
                  const pessoas = porSessao.get(s.id) ?? []
                  return (
                    <div key={s.id} className="card p-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="badge badge-inscrito">{rotuloTipo(s)}</span>
                        <span className="font-semibold">{s.titulo}</span>
                        <span className="text-sm text-muted">
                          {s.hora_inicio} ·{' '}
                          {s.vagas_max != null
                            ? `${pessoas.length} de ${s.vagas_max}`
                            : `${pessoas.length} marcações`}
                        </span>
                      </div>
                      {pessoas.length > 0 && (
                        <ul className="text-sm text-muted mt-2 grid gap-0.5">
                          {pessoas.map((p, i) => (
                            <li key={i}>{p.nome} — {p.email}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
