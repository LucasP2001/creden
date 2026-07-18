import Image from 'next/image'
import { EventoComStats } from '@/types'
import { ButtonLink } from './ui/Button'
import { TrocarCapaModal } from '@/app/dashboard/TrocarCapaModal'
import { formatarDataHora as formatarData } from '@/lib/datas'

// Card de evento no dashboard. Mostra inscritos e % de check-in.
export function EventCard({ evento }: { evento: EventoComStats }) {
  const pct =
    evento.total_inscritos > 0
      ? Math.round((evento.total_presentes / evento.total_inscritos) * 100)
      : 0

  return (
    <article className="card flex flex-col overflow-hidden transition hover:shadow-lift hover:-translate-y-0.5">
      {/* Mesmo "palco" das telas públicas, em miniatura: capa desfocada no
          fundo e a logo nítida por cima, sem cortar a arte. */}
      <div className="relative h-[104px] grid place-items-center overflow-hidden bg-secondary">
        {evento.imagem_url ? (
          <>
            <Image
              src={evento.imagem_url}
              alt=""
              aria-hidden
              fill
              className="object-cover scale-125 blur-2xl saturate-150"
            />
            <div className="absolute inset-0 bg-secondary/35" />
            <div className="relative h-[72px] aspect-[3/2] rounded-lg overflow-hidden bg-white shadow-card ring-1 ring-black/5">
              <Image
                src={evento.imagem_url}
                alt={`Capa de ${evento.nome}`}
                fill
                sizes="108px"
                className="object-contain p-1.5"
              />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-light" />
        )}
        <div className="absolute top-2 right-2">
          <TrocarCapaModal eventoId={evento.id} corAtual={evento.cor_capa} />
        </div>
      </div>
      <div className="p-[18px] flex-1 flex flex-col">
        <h3 className="text-[19px] font-semibold text-secondary">{evento.nome}</h3>
        <div className="text-[13px] text-muted mt-1">📅 {formatarData(evento.data_hora, evento.fuso)}</div>

        <div className="flex gap-6 my-4">
          <div>
            <div className="font-display text-[28px] font-semibold text-secondary leading-none">
              {evento.total_inscritos}
            </div>
            <div className="text-[13px] text-muted mt-1">inscritos</div>
          </div>
          <div>
            <div className="font-display text-[28px] font-semibold text-secondary leading-none">
              {pct}%
            </div>
            <div className="text-[13px] text-muted mt-1">check-in</div>
          </div>
        </div>

        <div className="h-1.5 bg-status-inscrito-bg rounded-pill overflow-hidden">
          <div className="h-full bg-success rounded-pill" style={{ width: `${pct}%` }} />
        </div>

        <div className="mt-auto pt-4">
          <ButtonLink variant="secondary" href={`/eventos/${evento.id}`} block>
            Abrir evento
          </ButtonLink>
        </div>
      </div>
    </article>
  )
}
