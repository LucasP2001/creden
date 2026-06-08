import { createServerSupabase } from '@/lib/supabase'
import { InscritoRow } from '@/components/InscritoRow'
import { ButtonLink } from '@/components/ui/Button'
import { Inscricao, Evento } from '@/types'

// Lista de inscritos (/eventos/[id]/inscritos). Server Component.
export default async function InscritosPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabase()

  // RLS garante que só o dono do evento acessa.
  const [{ data: evento }, { data: inscricoes }] = await Promise.all([
    supabase.from('eventos').select('*').eq('id', params.id).single(),
    supabase
      .from('inscricoes')
      .select('*')
      .eq('evento_id', params.id)
      .order('created_at', { ascending: false }),
  ])

  if (!evento) {
    return <div className="max-w-[1080px] mx-auto px-7 py-12">Evento não encontrado.</div>
  }

  const ev = evento as Evento
  const lista = (inscricoes ?? []) as Inscricao[]
  const presentes = lista.filter((i) => i.status === 'presente').length
  const aguardando = lista.filter((i) => i.status === 'inscrito').length
  const taxa = lista.length > 0 ? Math.round((presentes / lista.length) * 100) : 0

  return (
    <div className="max-w-[1080px] mx-auto px-7 py-8 pb-20">
      <div className="text-muted mb-6">
        <a href="/dashboard">← Meus eventos</a> / {ev.nome}
      </div>

      <div className="flex items-end justify-between gap-4 mb-7 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold">Inscritos</h1>
          <p className="text-muted mt-1">{ev.nome}</p>
        </div>
        <div className="flex gap-3">
          {/* TODO: gerar CSV no servidor (Route Handler) e baixar */}
          <ButtonLink variant="secondary" href={`/eventos/${ev.id}/inscritos/export`}>
            ⬇ Exportar CSV
          </ButtonLink>
          <ButtonLink href={`/eventos/${ev.id}/checkin`}>📷 Iniciar check-in</ButtonLink>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6 max-[860px]:grid-cols-2">
        <Stat valor={lista.length} label="Inscritos" />
        <Stat valor={presentes} label="Presentes" cor="text-success" />
        <Stat valor={aguardando} label="Aguardando" />
        <Stat valor={`${taxa}%`} label="Taxa de check-in" />
      </div>

      <div className="card overflow-hidden">
        {lista.length === 0 ? (
          <p className="p-8 text-center text-muted">
            Nenhum inscrito ainda — compartilhe o link para começar.
          </p>
        ) : (
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
              </tr>
            </thead>
            <tbody>
              {lista.map((i) => (
                <InscritoRow key={i.id} inscricao={i} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Stat({ valor, label, cor = 'text-secondary' }: { valor: React.ReactNode; label: string; cor?: string }) {
  return (
    <div className="card p-[22px]">
      <div className={`font-display text-[28px] font-semibold leading-none ${cor}`}>{valor}</div>
      <div className="text-[13px] text-muted mt-1">{label}</div>
    </div>
  )
}
