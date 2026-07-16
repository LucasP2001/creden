import Image from 'next/image'
import { EventoComStats } from '@/types'
import { ButtonLink } from './ui/Button'
import { TrocarCapaModal } from '@/app/dashboard/TrocarCapaModal'

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Card de evento no dashboard. Mostra inscritos e % de check-in.
export function EventCard({ evento }: { evento: EventoComStats }) {
  const pct =
    evento.total_inscritos > 0
      ? Math.round((evento.total_presentes / evento.total_inscritos) * 100)
      : 0

  return (
    <article className="card flex flex-col overflow-hidden transition hover:shadow-lift hover:-translate-y-0.5">
      <div className="relative h-[90px] overflow-hidden">
        {evento.imagem_url ? (
          <Image src={evento.imagem_url} alt={`Capa de ${evento.nome}`} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-light" />
        )}
        <div className="absolute top-2 right-2">
          <TrocarCapaModal eventoId={evento.id} />
        </div>
      </div>
      <div className="p-[18px] flex-1 flex flex-col">
        <h3 className="text-[19px] font-semibold text-secondary">{evento.nome}</h3>
        <div className="text-[13px] text-muted mt-1">📅 {formatarData(evento.data_hora)}</div>

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

        <div className="mt-auto pt-4 flex justify-end">
          <ButtonLink variant="secondary" href={`/eventos/${evento.id}/inscritos`}>
            Gerenciar
          </ButtonLink>
        </div>
      </div>
    </article>
  )
}
