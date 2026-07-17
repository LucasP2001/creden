import { Inscricao } from '@/types'
import { Badge } from './ui/Badge'
import { FUSO_BR, formatarHora } from '@/lib/datas'

function hora(iso: string | null): string {
  if (!iso) return '—'
  return formatarHora(iso)
}

function dataHora(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: FUSO_BR,
  })
}

// Linha da tabela de inscritos (/eventos/[id]/inscritos).
export function InscritoRow({ inscricao }: { inscricao: Inscricao }) {
  return (
    <tr className="border-b border-line last:border-0 hover:bg-[#faf8f3]">
      <td className="px-4 py-3.5 text-sm font-semibold">{inscricao.nome}</td>
      <td className="px-4 py-3.5 text-sm text-muted">{inscricao.email}</td>
      <td className="px-4 py-3.5 text-sm text-muted">{dataHora(inscricao.created_at)}</td>
      <td className="px-4 py-3.5 text-sm">
        <Badge status={inscricao.status} />
      </td>
      <td className="px-4 py-3.5 text-sm tabular-nums">{hora(inscricao.checkin_at)}</td>
    </tr>
  )
}
