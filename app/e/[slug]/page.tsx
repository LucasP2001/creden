import Link from 'next/link'
import Image from 'next/image'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase'
import { Evento } from '@/types'
import { Logo } from '@/components/Logo'
import { CompartilharBotao } from './CompartilharBotao'
import { Cronograma } from '@/components/Cronograma'
import { RecuperarAcesso } from './RecuperarAcesso'
import { contarPorSessao } from '@/lib/marcacoes'

function formatarDataLonga(iso: string): string {
  const d = new Date(iso)
  const data = d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${data} · ${hora}`
}

// Página pública do evento (/e/[slug]). Acessível anonimamente.
export default async function EventoPublicoPage({ params }: { params: { slug: string } }) {
  const supabase = await createServerSupabase()

  const { data: evento } = await supabase
    .from('eventos')
    .select('*, inscricoes(count)')
    .eq('slug', params.slug)
    .single()

  if (!evento) {
    return (
      <div className="min-h-screen grid place-items-center text-center px-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Evento não encontrado</h1>
          <p className="text-muted mt-2">O link pode estar errado ou o evento foi removido.</p>
          <Link href="/" className="btn btn-secondary mt-6 inline-flex">
            Voltar
          </Link>
        </div>
      </div>
    )
  }

  const ev = evento as Evento & { inscricoes: { count: number }[] }
  const inscritos = ev.inscricoes?.[0]?.count ?? 0
  const vagasRestantes = ev.vagas_max != null ? Math.max(0, ev.vagas_max - inscritos) : null
  const lotado = vagasRestantes === 0
  const pctLotacao = ev.vagas_max ? Math.min(100, Math.round((inscritos / ev.vagas_max) * 100)) : 0

  return (
    <main className="min-h-screen pb-28">
      <header className="h-14 flex items-center justify-between px-6 border-b border-line bg-surface">
        <Logo />
        <CompartilharBotao nome={ev.nome} />
      </header>

      {/* Hero */}
      <div className="relative h-[260px] overflow-hidden" style={ev.imagem_url ? { backgroundColor: ev.cor_capa } : undefined}>
        {ev.imagem_url ? (
          <Image src={ev.imagem_url} alt={`Capa de ${ev.nome}`} fill priority className="object-contain" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary via-primary to-primary-light" />
        )}
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-[760px] mx-auto w-full px-6 pb-8">
            {vagasRestantes != null && (
              <span
                className={`badge font-bold ${lotado ? 'bg-error text-white' : 'bg-white/95 text-primary'}`}
              >
                {lotado ? 'Esgotado' : `${vagasRestantes} ${vagasRestantes === 1 ? 'vaga restante' : 'vagas restantes'}`}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[760px] mx-auto -mt-12 px-5 relative">
        <article className="card shadow-lift overflow-hidden animate-fade-up">
          <div className="p-7 sm:p-9">
            <h1 className="font-display text-[clamp(1.8rem,4vw,2.6rem)] font-semibold leading-tight">
              {ev.nome}
            </h1>
            <p className="text-muted mt-2 text-sm">Organizado com Creden</p>

            <div className="grid sm:grid-cols-2 gap-3.5 mt-7">
              <MetaItem icon="📅" label="Data e hora" valor={formatarDataLonga(ev.data_hora)} />
              {ev.local && <MetaItem icon="📍" label="Local" valor={ev.local} />}
              <MetaItem
                icon="🎟"
                label="Inscrições"
                valor={
                  ev.vagas_max != null
                    ? `${inscritos} de ${ev.vagas_max} vagas`
                    : `${inscritos} inscrito${inscritos === 1 ? '' : 's'}`
                }
              />
              <MetaItem
                icon="💳"
                label="Valor"
                valor={ev.valor > 0 ? `R$ ${(ev.valor / 100).toFixed(2)}` : 'Gratuito'}
              />
            </div>

            {ev.vagas_max != null && (
              <div className="mt-6">
                <div className="h-2 bg-status-inscrito-bg rounded-pill overflow-hidden">
                  <div
                    className={`h-full rounded-pill ${pctLotacao >= 100 ? 'bg-error' : 'bg-accent'}`}
                    style={{ width: `${Math.max(4, pctLotacao)}%` }}
                  />
                </div>
                <p className="text-xs text-muted mt-2">{pctLotacao}% das vagas preenchidas</p>
              </div>
            )}

            {ev.descricao && (
              <>
                <hr className="border-line my-7" />
                <p className="text-[16px] leading-relaxed text-[#3a3833] whitespace-pre-line">
                  {ev.descricao}
                </p>
              </>
            )}
          </div>
        </article>
        <Cronograma dias={ev.dias ?? []} contagens={await contarPorSessao(createAdminSupabase(), ev.id)} />
        <p className="text-center text-xs text-muted mt-6">
          Você receberá um ingresso digital com QR code por e-mail.
        </p>
        <RecuperarAcesso slug={ev.slug} />
      </div>

      {/* Barra de inscrição fixa no rodapé */}
      <div className="fixed bottom-0 inset-x-0 z-20 bg-surface/90 backdrop-blur border-t border-line">
        <div className="max-w-[760px] mx-auto px-5 py-3.5 flex items-center justify-between gap-4">
          <div>
            <div className="font-display font-semibold text-xl text-secondary leading-none">
              {ev.valor > 0 ? `R$ ${(ev.valor / 100).toFixed(2)}` : 'Gratuito'}
            </div>
            <span className="text-xs text-muted">
              {lotado ? 'Não há mais vagas' : 'Inscrição garante sua vaga'}
            </span>
          </div>
          {lotado ? (
            <button disabled className="btn btn-ghost btn-lg opacity-60 cursor-not-allowed">
              Esgotado
            </button>
          ) : (
            <Link href={`/e/${ev.slug}/inscricao`} className="btn btn-accent btn-lg">
              Fazer inscrição →
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}

function MetaItem({ icon, label, valor }: { icon: string; label: string; valor: string }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="meta-ic text-lg">{icon}</span>
      <div>
        <div className="text-xs text-muted uppercase tracking-wide">{label}</div>
        <div className="font-semibold text-[15px] capitalize">{valor}</div>
      </div>
    </div>
  )
}
