import { notFound } from 'next/navigation'
import Image from 'next/image'
import { createAdminSupabase } from '@/lib/supabase'
import { acessoEvento } from '@/lib/acesso'
import { Evento } from '@/types'
import { MetaIcon } from '@/components/MetaIcon'
import { ButtonLink } from '@/components/ui/Button'
import { formatarDataLonga, rotuloCidadeFuso } from '@/lib/datas'
import { estadoInscricao, rotuloPeriodo } from '@/lib/periodo'
import { hostPublico } from '@/lib/url'

// Aba "Evento" (/eventos/[id]): resumo read-only do evento para o organizador
// (dono ou colaborador). A edição fica em /eventos/[id]/editar (botão "Editar",
// só para quem pode editar). Guarda por acessoEvento; sem acesso vira 404.
export default async function EventoResumoPage({ params }: { params: { id: string } }) {
  const acesso = await acessoEvento(params.id)
  if (!acesso.podeVer) notFound()

  const { data: evento } = await createAdminSupabase()
    .from('eventos')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!evento) notFound()
  const ev = evento as Evento

  // Contagem de inscritos (admin: ignora RLS, mas já validamos o acesso acima).
  const { count } = await createAdminSupabase()
    .from('inscricoes')
    .select('id', { count: 'exact', head: true })
    .eq('evento_id', ev.id)
    .neq('status', 'cancelado')
  const inscritos = count ?? 0

  const estado = estadoInscricao(ev.inscricoes_abrem_em, ev.inscricoes_fecham_em)
  const avisoPeriodo = rotuloPeriodo(
    ev.inscricoes_abrem_em,
    ev.inscricoes_fecham_em,
    new Date(),
    ev.fuso
  )
  const urlPublica = `${hostPublico()}/e/${ev.slug}`

  const estadoRotulo =
    estado === 'aberto'
      ? 'Inscrições abertas'
      : estado === 'nao_abriu'
        ? 'Inscrições ainda não abriram'
        : 'Inscrições encerradas'
  const estadoCor =
    estado === 'aberto'
      ? 'bg-status-presente-bg text-status-presente'
      : estado === 'nao_abriu'
        ? 'bg-status-inscrito-bg text-status-inscrito'
        : 'bg-status-cancelado-bg text-status-cancelado'

  return (
    <div className="grid gap-5 [grid-template-columns:1fr_320px] items-start max-[860px]:grid-cols-1">
      <div className="grid gap-5">
        {/* Cartão principal: capa + dados */}
        <div className="card overflow-hidden">
          {ev.imagem_url ? (
            <div className="relative h-[160px] bg-secondary grid place-items-center overflow-hidden">
              <Image
                src={ev.imagem_url}
                alt=""
                aria-hidden
                fill
                className="object-cover scale-125 blur-2xl saturate-150"
              />
              <div className="absolute inset-0 bg-secondary/35" />
              <div className="relative h-[104px] aspect-[3/2] rounded-lg overflow-hidden bg-white shadow-card ring-1 ring-black/5">
                <Image
                  src={ev.imagem_url}
                  alt={`Capa de ${ev.nome}`}
                  fill
                  sizes="160px"
                  className="object-contain p-1.5"
                />
              </div>
            </div>
          ) : (
            <div className="h-[120px] bg-gradient-to-br from-primary to-primary-light" />
          )}

          <div className="p-[22px]">
            <span className={`badge ${estadoCor}`}>{estadoRotulo}</span>
            <h2 className="font-display text-2xl font-semibold text-secondary mt-3">{ev.nome}</h2>

            <div className="grid sm:grid-cols-2 gap-2.5 mt-4">
              <Meta
                icon="calendario"
                label="Data e hora"
                valor={`${capitalizar(formatarDataLonga(ev.data_hora, ev.fuso))} (${rotuloCidadeFuso(ev.fuso)})`}
              />
              {ev.local && <Meta icon="local" label="Local" valor={ev.local} />}
              <Meta
                icon="valor"
                label="Valor"
                valor={ev.valor > 0 ? `R$ ${(ev.valor / 100).toFixed(2)}` : 'Gratuito'}
              />
              <Meta
                icon="ingresso"
                label="Vagas"
                valor={ev.vagas_max != null ? `${inscritos} / ${ev.vagas_max}` : `${inscritos} (sem limite)`}
              />
            </div>

            {avisoPeriodo && <p className="text-sm text-muted mt-4">{avisoPeriodo}</p>}

            {ev.descricao && (
              <>
                <hr className="border-line my-5" />
                <p className="text-[15px] leading-relaxed text-[#3a3833] whitespace-pre-line">
                  {ev.descricao}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Coluna lateral: ações e link público */}
      <div className="grid gap-4">
        <div className="card p-[22px] grid gap-3">
          {acesso.podeEditar && (
            <ButtonLink href={`/eventos/${ev.id}/editar`} block>
              Editar evento
            </ButtonLink>
          )}
          <ButtonLink href={`/eventos/${ev.id}/inscritos`} variant="secondary" block>
            Ver inscritos
          </ButtonLink>
        </div>

        <div className="card p-[22px]">
          <div className="text-[11px] text-muted uppercase tracking-wide font-semibold">
            Link público
          </div>
          <a
            href={urlPublica}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-sm break-all hover:underline mt-1.5 block"
          >
            {urlPublica.replace(/^https?:\/\//, '')}
          </a>
          <p className="text-xs text-muted mt-2">O link não muda ao editar.</p>
        </div>
      </div>
    </div>
  )
}

// Só a primeira letra maiúscula (o CSS `capitalize` viraria "10 De Agosto").
function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function Meta({
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
