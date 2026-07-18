import Link from 'next/link'
import Image from 'next/image'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase'
import { Evento } from '@/types'
import { MetaIcon } from '@/components/MetaIcon'
import { OndaPalco } from '@/components/OndaPalco'
import { CompartilharBotao } from './CompartilharBotao'
import { Cronograma } from '@/components/Cronograma'
import { RecuperarAcesso } from './RecuperarAcesso'
import { contarPorSessao } from '@/lib/marcacoes'
import { estadoInscricao, rotuloPeriodo } from '@/lib/periodo'
import { formatarDataLonga } from '@/lib/datas'

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
  const estadoPeriodo = estadoInscricao(ev.inscricoes_abrem_em, ev.inscricoes_fecham_em)
  const avisoPeriodo = rotuloPeriodo(ev.inscricoes_abrem_em, ev.inscricoes_fecham_em)
  const pctLotacao = ev.vagas_max ? Math.min(100, Math.round((inscritos / ev.vagas_max) * 100)) : 0

  return (
    <main className="min-h-screen pb-28 relative">
      {/* Sem header: o palco começa no topo. Compartilhar flutua sobre ele. */}
      <div className="absolute top-4 right-4 z-30">
        <CompartilharBotao nome={ev.nome} />
      </div>

      {/* Hero em "palco": a própria capa, ampliada e desfocada, preenche o fundo.
          A logo nítida NÃO fica aqui dentro (overflow-hidden a prenderia) — vem
          logo abaixo, sobrepondo hero e card. */}
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
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-secondary via-primary to-primary-light" />
            <div className="absolute inset-0 bg-grid opacity-40" />
          </>
        )}
        <div className="absolute inset-0 flex items-start">
          <div className="max-w-[760px] mx-auto w-full px-6 pt-5">
            {vagasRestantes != null && (
              <span
                className={`badge font-bold ${lotado ? 'bg-error text-white' : 'bg-white/95 text-primary'}`}
              >
                {lotado ? 'Esgotado' : `${vagasRestantes} ${vagasRestantes === 1 ? 'vaga restante' : 'vagas restantes'}`}
              </span>
            )}
          </div>
        </div>
        <OndaPalco />
      </div>

      {/* Logo nítida sobrepondo hero e card: sobe sobre o desfoque e desce um
          pouco sobre o card de informações, ficando na frente dos dois. */}
      {ev.imagem_url && (
        <div className="max-w-[760px] mx-auto px-5 relative z-10 flex justify-center -mt-[124px] pointer-events-none">
          <div className="relative w-full max-w-[200px] aspect-[3/2] rounded-2xl overflow-hidden bg-white shadow-lift ring-1 ring-black/5">
            <Image
              src={ev.imagem_url}
              alt={`Capa de ${ev.nome}`}
              fill
              priority
              sizes="200px"
              className="object-contain p-2"
            />
          </div>
        </div>
      )}

      {/* Conteúdo direto no fundo sand (sem card branco), o mesmo tratamento das
          demais telas: o palco com a onda faz a moldura. */}
      <div className={`max-w-[760px] mx-auto px-5 relative animate-fade-up ${ev.imagem_url ? 'pt-9' : '-mt-12'}`}>
        <h1 className="font-display text-[clamp(1.8rem,4vw,2.6rem)] font-semibold leading-tight text-secondary">
          {ev.nome}
        </h1>
        <p className="text-muted mt-1 text-sm">Organizado com Creden</p>

        {/* Dados do evento em cards 2×2. Contagem de inscritos fica de fora:
            "0 inscritos" num evento novo só passa má impressão. */}
        <div className="grid sm:grid-cols-2 gap-2.5 mt-4">
          <MetaItem icon="calendario" label="Data e hora" valor={capitalizar(formatarDataLonga(ev.data_hora))} />
          {ev.local && <MetaItem icon="local" label="Local" valor={ev.local} />}
          <MetaItem
            icon="valor"
            label="Valor"
            valor={ev.valor > 0 ? `R$ ${(ev.valor / 100).toFixed(2)}` : 'Gratuito'}
          />
        </div>

        {ev.vagas_max != null && (
          <div className="mt-5">
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
              {estadoPeriodo === 'encerrado'
                ? 'O prazo de inscrição terminou'
                : estadoPeriodo === 'nao_abriu'
                  ? (avisoPeriodo ?? 'Inscrições ainda não abriram')
                  : lotado
                    ? 'Não há mais vagas'
                    : (avisoPeriodo ?? 'Inscrição garante sua vaga')}
            </span>
          </div>
          {estadoPeriodo !== 'aberto' ? (
            <button disabled className="btn btn-ghost btn-lg opacity-60 cursor-not-allowed">
              {estadoPeriodo === 'encerrado' ? 'Encerrado' : 'Em breve'}
            </button>
          ) : lotado ? (
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

// Só a primeira letra maiúscula. O CSS `capitalize` capitaliza cada palavra
// ("10 De Agosto"), então a data vem daqui já ajustada.
function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function MetaItem({
  icon,
  label,
  valor,
}: {
  icon: 'calendario' | 'local' | 'ingresso' | 'valor'
  label: string
  valor: string
}) {
  return (
    <div className="flex gap-3 items-center bg-surface border border-line rounded-xl px-3.5 py-3">
      <span className="grid place-items-center w-9 h-9 rounded-lg bg-[#e9efe7] text-primary shrink-0">
        <MetaIcon nome={icon} className="w-[18px] h-[18px]" />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] text-muted uppercase tracking-wide">{label}</div>
        <div className="font-semibold text-[14px] leading-tight break-words">{valor}</div>
      </div>
    </div>
  )
}
