import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase'
import { Evento } from '@/types'

function formatarDataLonga(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// Página pública do evento (/e/[slug]). Acessível anonimamente (RLS permite leitura pública).
export default async function EventoPublicoPage({ params }: { params: { slug: string } }) {
  const supabase = await createServerSupabase()

  const { data: evento } = await supabase
    .from('eventos')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!evento) {
    return (
      <div className="min-h-screen grid place-items-center text-center px-6">
        <div>
          <h1 className="text-2xl font-semibold">Evento não encontrado</h1>
          <p className="text-muted mt-2">O link pode estar errado ou o evento foi removido.</p>
        </div>
      </div>
    )
  }

  const ev = evento as Evento
  // TODO: contar inscrições para mostrar vagas restantes (count em inscricoes).
  const vagasRestantes = ev.vagas_max

  return (
    <main className="min-h-screen">
      <header className="h-14 flex items-center px-6 border-b border-line bg-surface">
        <span className="font-display font-semibold text-lg text-secondary">🎟 Creden</span>
      </header>

      <div className="h-[240px] bg-gradient-to-br from-primary to-primary-light relative">
        {vagasRestantes != null && (
          <span className="badge absolute top-[18px] right-6 bg-white/90 text-primary font-bold">
            {vagasRestantes} vagas
          </span>
        )}
      </div>

      <div className="max-w-[760px] mx-auto -mt-[70px] px-5 pb-20 relative">
        <article className="card rounded-[20px] shadow-lift overflow-hidden">
          <div className="p-[34px]">
            <h1 className="font-display text-4xl font-semibold leading-tight">{ev.nome}</h1>
            {ev.local && <p className="text-muted mt-2">{ev.local}</p>}

            <div className="grid gap-3.5 my-6">
              <MetaItem icon="📅" titulo={formatarDataLonga(ev.data_hora)} />
              {ev.local && <MetaItem icon="📍" titulo={ev.local} />}
              {ev.vagas_max != null && <MetaItem icon="🎟" titulo={`${ev.vagas_max} vagas no total`} />}
            </div>

            <hr className="border-line my-7" />
            {ev.descricao && <p className="text-[16px] leading-relaxed text-[#3a3833]">{ev.descricao}</p>}
          </div>

          <div className="sticky bottom-0 bg-surface border-t border-line px-[34px] py-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="font-display font-semibold text-[22px] text-secondary">
                {ev.valor > 0 ? `R$ ${(ev.valor / 100).toFixed(2)}` : 'Gratuito'}
              </div>
              <span className="text-xs text-muted">Inscrição garante sua vaga</span>
            </div>
            <Link href={`/e/${ev.slug}/inscricao`} className="btn btn-accent btn-lg">
              Fazer inscrição →
            </Link>
          </div>
        </article>
      </div>
    </main>
  )
}

function MetaItem({ icon, titulo }: { icon: string; titulo: string }) {
  return (
    <div className="flex gap-3.5 items-start">
      <span className="w-10 h-10 rounded-md bg-status-inscrito-bg text-primary grid place-items-center text-lg shrink-0">
        {icon}
      </span>
      <div className="font-semibold text-[15px] self-center">{titulo}</div>
    </div>
  )
}
