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

  // Fora do período: mesmo "palco" da página pública — hero desfocado, a logo
  // nítida sobreposta na frente do card, e o aviso dentro do card abaixo dela.
  return (
    <main className="min-h-screen">
      <header className="h-14 flex items-center px-6 border-b border-line bg-surface">
        <Logo />
      </header>

      <div className="relative h-[150px] overflow-hidden bg-secondary">
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
            <div className="absolute inset-0 bg-secondary/35" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary via-primary to-primary-light" />
        )}
      </div>

      {ev.imagem_url && (
        <div className="max-w-[560px] mx-auto px-4 relative z-10 flex justify-center -mt-[100px] pointer-events-none">
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

      <div className={`max-w-[560px] mx-auto px-4 relative ${ev.imagem_url ? '-mt-12' : '-mt-12'}`}>
        <div className="card shadow-lift overflow-hidden">
          <div className={`px-8 pb-24 text-center ${ev.imagem_url ? 'pt-16' : 'pt-10'}`}>
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
        </div>
      </div>
    </main>
  )
}
