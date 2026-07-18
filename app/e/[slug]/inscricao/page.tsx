import Image from 'next/image'
import { createServerSupabase } from '@/lib/supabase'
import { Evento } from '@/types'
import { InscricaoForm } from './InscricaoForm'
import { MetaIcon } from '@/components/MetaIcon'
import { OndaPalco } from '@/components/OndaPalco'
import { estadoInscricao, rotuloPeriodo } from '@/lib/periodo'
import { formatarDataHora, rotuloCidadeFuso } from '@/lib/datas'

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

  // Aberto: mesmo "palco" das demais telas (hero desfocado + logo) e o
  // formulário abaixo, pra a inscrição ter a identidade do evento.
  if (estado === 'aberto') {
    return (
      <main className="min-h-screen bg-sand">
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
          <OndaPalco />
        </div>

        {ev.imagem_url && (
          <div className="max-w-[520px] mx-auto px-4 relative z-10 flex justify-center -mt-[130px] pointer-events-none">
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

        <div className={`max-w-[520px] mx-auto px-5 pb-16 ${ev.imagem_url ? 'pt-6' : 'pt-8'}`}>
          <a href={`/e/${ev.slug}`} className="text-muted text-sm hover:text-ink">
            ← Voltar ao evento
          </a>
          <h1 className="font-display text-3xl font-semibold mt-2 text-secondary">Fazer inscrição</h1>
          <p className="text-ink font-medium mt-1">{ev.nome}</p>

          {/* Contexto do evento: dá segurança de que é a inscrição certa. */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted mt-2 mb-7">
            <span className="inline-flex items-center gap-1.5">
              <MetaIcon nome="calendario" className="w-4 h-4 text-primary" />
              {`${formatarDataHora(ev.data_hora, ev.fuso)} (${rotuloCidadeFuso(ev.fuso)})`}
            </span>
            {ev.local && (
              <span className="inline-flex items-center gap-1.5">
                <MetaIcon nome="local" className="w-4 h-4 text-primary" />
                {ev.local}
              </span>
            )}
          </div>

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
        <OndaPalco />
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
            {rotuloPeriodo(ev.inscricoes_abrem_em, ev.inscricoes_fecham_em, new Date(), ev.fuso)}
          </p>
        )}
        <a href={`/e/${ev.slug}`} className="btn btn-secondary mt-8 inline-flex">
          Ver o evento
        </a>
      </div>
    </main>
  )
}
