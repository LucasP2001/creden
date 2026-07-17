import Image from 'next/image'
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
          <div className="card mt-3 overflow-hidden">
            {/* Topo em "palco": a capa desfocada preenche o fundo e a logo nítida
                fica por cima, o mesmo tratamento da página pública. Tudo dentro
                do card (overflow-hidden), então a logo não sai da faixa. */}
            {ev.imagem_url ? (
              <div className="relative h-40 w-full grid place-items-center overflow-hidden bg-secondary">
                <Image
                  src={ev.imagem_url}
                  alt=""
                  aria-hidden
                  fill
                  className="object-cover scale-125 blur-2xl saturate-150"
                />
                <div className="absolute inset-0 bg-secondary/35" />
                <div className="relative w-[160px] aspect-[3/2] rounded-xl overflow-hidden bg-white shadow-lift ring-1 ring-black/5">
                  <Image
                    src={ev.imagem_url}
                    alt={`Capa de ${ev.nome}`}
                    fill
                    sizes="160px"
                    className="object-contain p-2"
                  />
                </div>
              </div>
            ) : (
              <div className="h-20 w-full bg-gradient-to-br from-secondary via-primary to-primary-light" />
            )}

            <div className="p-8 text-center">
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
          </div>
        )}
      </div>
    </main>
  )
}
