import { InscricaoStatus } from '@/types'

const labels: Record<InscricaoStatus, string> = {
  inscrito: 'Inscrito',
  presente: 'Presente',
  cancelado: 'Cancelado',
}

const classes: Record<InscricaoStatus, string> = {
  inscrito: 'badge-inscrito',
  presente: 'badge-presente',
  cancelado: 'badge-cancelado',
}

// Badge de status da inscrição (skill creden-design: inscrito / presente / cancelado).
export function Badge({ status }: { status: InscricaoStatus }) {
  return (
    <span className={`badge ${classes[status]}`}>
      <span className="w-[7px] h-[7px] rounded-full bg-current" />
      {labels[status]}
    </span>
  )
}
