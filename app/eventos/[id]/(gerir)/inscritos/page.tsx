import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase'
import { acessoEvento } from '@/lib/acesso'
import { InscritosClient } from './InscritosClient'
import { ButtonLink } from '@/components/ui/Button'
import { Inscricao, Evento } from '@/types'
import { sessoesDoEvento } from '@/lib/sessoes'

// Lista de inscritos (/eventos/[id]/inscritos). Server Component.
// Guarda por acessoEvento — dono ou colaborador (editor/checkin) veem a lista;
// sem acesso vira 404.
export default async function InscritosPage({ params }: { params: { id: string } }) {
  const acesso = await acessoEvento(params.id)
  if (!acesso.podeVer) notFound()

  const supabase = await createServerSupabase()

  const [{ data: evento }, { data: inscricoes }, { data: marcacoes }] = await Promise.all([
    supabase.from('eventos').select('*').eq('id', params.id).single(),
    supabase
      .from('inscricoes')
      .select('*')
      .eq('evento_id', params.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('inscricoes_sessoes')
      .select('inscricao_id, sessao_id')
      .eq('evento_id', params.id),
  ])

  if (!evento) {
    return <div className="max-w-[1080px] mx-auto px-7 py-12">Evento não encontrado.</div>
  }

  const ev = evento as Evento
  const sessoes = sessoesDoEvento(ev.dias ?? [])
  const marcacoesPorInscrito: Record<string, string[]> = {}
  for (const m of (marcacoes ?? []) as { inscricao_id: string; sessao_id: string }[]) {
    ;(marcacoesPorInscrito[m.inscricao_id] ??= []).push(m.sessao_id)
  }
  const lista = (inscricoes ?? []) as Inscricao[]
  const presentes = lista.filter((i) => i.status === 'presente').length
  const aguardando = lista.filter((i) => i.status === 'inscrito').length
  // Taxa sobre quem não cancelou — inscrições canceladas não deveriam pesar na meta.
  const base = lista.filter((i) => i.status !== 'cancelado').length
  const taxa = base > 0 ? Math.round((presentes / base) * 100) : 0

  const podeCheckin = acesso.podeEditar || acesso.papel === 'checkin'

  return (
    <>
      <div className="flex items-center justify-end gap-3 mb-6 flex-wrap">
        <ButtonLink variant="secondary" href={`/eventos/${ev.id}/inscritos/export`}>
          ⬇ Exportar XLSX
        </ButtonLink>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6 max-[860px]:grid-cols-2">
        <Stat valor={lista.length} label="Inscritos" />
        <Stat valor={presentes} label="Presentes" cor="text-success" />
        <Stat valor={aguardando} label="Aguardando" />
        <Stat valor={`${taxa}%`} label="Taxa de check-in" />
      </div>

      <InscritosClient
        eventoId={ev.id}
        inscricoes={lista}
        podeEditar={acesso.podeEditar}
        podeCheckin={podeCheckin}
        camposExtras={ev.campos_extras ?? []}
        dias={ev.dias ?? []}
        sessoes={sessoes}
        marcacoesPorInscrito={marcacoesPorInscrito}
      />
    </>
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
