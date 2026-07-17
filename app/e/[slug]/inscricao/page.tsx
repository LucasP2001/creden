import { createServerSupabase } from '@/lib/supabase'
import { Evento } from '@/types'
import { InscricaoForm } from './InscricaoForm'
import { Logo } from '@/components/Logo'
import { estadoInscricao, rotuloPeriodo } from '@/lib/periodo'

// Formulário de inscrição (/e/[slug]/inscricao). Público.
export default async function InscricaoPage({ params }: { params: { slug: string } }) {
  const supabase = await createServerSupabase()
  const { data: evento } = await supabase
    .from('eventos')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!evento) {
    return <div className="min-h-screen grid place-items-center">Evento não encontrado.</div>
  }

  const ev = evento as Evento
  const estado = estadoInscricao(ev.inscricoes_abrem_em, ev.inscricoes_fecham_em)

  return (
    <main className="min-h-screen">
      <header className="h-14 flex items-center px-6 border-b border-line bg-surface">
        <Logo />
      </header>
      <div className="max-w-[520px] mx-auto px-5 py-10">
        <a href={`/e/${ev.slug}`} className="text-muted text-sm">← Voltar ao evento</a>

        {/* Fora do período o formulário nem aparece: a action barraria, mas só
            depois de a pessoa preencher tudo. */}
        {estado === 'aberto' ? (
          <>
            <h1 className="font-display text-3xl font-semibold mt-3">Fazer inscrição</h1>
            <p className="text-muted mt-1 mb-7">{ev.nome}</p>
            <InscricaoForm slug={ev.slug} camposExtras={ev.campos_extras ?? []} />
          </>
        ) : (
          <div className="card p-8 mt-3 text-center">
            <div className="text-3xl">{estado === 'encerrado' ? '🔒' : '⏳'}</div>
            <h1 className="font-display text-2xl font-semibold mt-3">
              {estado === 'encerrado' ? 'Inscrições encerradas' : 'Inscrições ainda não abriram'}
            </h1>
            <p className="text-muted mt-2 text-sm">{ev.nome}</p>
            {/* Só faz sentido quando ainda vai abrir: aí o rótulo diz a data.
                Encerrado, ele repetiria o título. */}
            {estado === 'nao_abriu' && (
              <p className="text-secondary font-semibold text-sm mt-1">
                {rotuloPeriodo(ev.inscricoes_abrem_em, ev.inscricoes_fecham_em)}
              </p>
            )}
            <a href={`/e/${ev.slug}`} className="btn btn-secondary mt-6 inline-flex">
              Ver o evento
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
