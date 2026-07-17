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

  // Aberto: formulário no container estreito de sempre.
  if (estado === 'aberto') {
    return (
      <main className="min-h-screen">
        <header className="h-14 flex items-center px-6 border-b border-line bg-surface">
          <Logo />
        </header>
        <div className="max-w-[520px] mx-auto px-5 py-10">
          <a href={`/e/${ev.slug}`} className="text-muted text-sm">← Voltar ao evento</a>
          <h1 className="font-display text-3xl font-semibold mt-3">Fazer inscrição</h1>
          <p className="text-muted mt-1 mb-7">{ev.nome}</p>
          <InscricaoForm slug={ev.slug} camposExtras={ev.campos_extras ?? []} />
        </div>
      </main>
    )
  }

  // Fora do período: mesmo "palco" das telas do participante — hero desfocado,
  // a logo nítida sobreposta e o aviso direto no fundo, sem card (o conteúdo é
  // curto e o card competiria com o palco).
  return (
    <main className="min-h-screen bg-sand">
      <header className="h-14 flex items-center px-6 border-b border-line bg-surface">
        <Logo />
      </header>

      <div className="relative h-[200px] overflow-hidden bg-secondary">
        {ev.imagem_url ? (
          <>
            <Image
              src={ev.imagem_url}
              alt=""
              aria-hidden
              fill
              priority
              sizes="100vw"
              className="object-cover scale-125 blur-2xl saturate-150"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-secondary/30 to-secondary/10" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary via-primary to-primary-light" />
        )}
      </div>

      {ev.imagem_url && (
        <div className="max-w-[560px] mx-auto px-4 relative z-10 flex justify-center -mt-[130px] pointer-events-none">
          <div className="relative w-full max-w-[220px] aspect-[3/2] rounded-2xl overflow-hidden bg-white shadow-lift ring-1 ring-black/5">
            <Image
              src={ev.imagem_url}
              alt={`Capa de ${ev.nome}`}
              fill
              priority
              sizes="220px"
              className="object-contain p-2"
            />
          </div>
        </div>
      )}

      <div className="max-w-[560px] mx-auto px-6 text-center pt-8 pb-16">
        <div className="text-4xl">{estado === 'encerrado' ? '🔒' : '⏳'}</div>
        <h1 className="font-display text-2xl font-semibold mt-4">
          {estado === 'encerrado' ? 'Inscrições encerradas' : 'Inscrições ainda não abriram'}
        </h1>
        <p className="text-muted mt-3 text-sm">{ev.nome}</p>
        {/* Só faz sentido quando ainda vai abrir: aí o rótulo diz a data.
            Encerrado, ele repetiria o título. */}
        {estado === 'nao_abriu' && (
          <p className="text-secondary font-semibold text-sm mt-1">
            {rotuloPeriodo(ev.inscricoes_abrem_em, ev.inscricoes_fecham_em)}
          </p>
        )}
        <a href={`/e/${ev.slug}`} className="btn btn-secondary mt-8 inline-flex">
          Ver o evento
        </a>
      </div>
    </main>
  )
}
