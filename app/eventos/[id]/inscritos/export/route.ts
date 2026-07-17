import { createServerSupabase } from '@/lib/supabase'
import { formatarDataHoraCurta } from '@/lib/datas'
import { Evento, Inscricao } from '@/types'

// Export CSV dos inscritos de um evento (/eventos/[id]/inscritos/export).
// Server-side; RLS garante que só o dono do evento recebe os dados.

const STATUS_LABEL: Record<Inscricao['status'], string> = {
  inscrito: 'Inscrito',
  presente: 'Presente',
  cancelado: 'Cancelado',
}

// Escapa um campo para CSV (aspas duplas + cerca se tiver vírgula/aspas/quebra).
function csv(valor: string): string {
  const v = valor ?? ''
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabase()

  const [{ data: eventoRow }, { data: inscricoesRows }] = await Promise.all([
    supabase.from('eventos').select('*').eq('id', params.id).single(),
    supabase
      .from('inscricoes')
      .select('*')
      .eq('evento_id', params.id)
      .order('created_at', { ascending: true }),
  ])

  if (!eventoRow) {
    return new Response('Evento não encontrado.', { status: 404 })
  }

  const evento = eventoRow as Evento
  const inscricoes = (inscricoesRows ?? []) as Inscricao[]

  // Colunas extras a partir dos campos definidos no evento.
  const colunasExtras = (evento.campos_extras ?? []).map((c) => c.label)

  const header = ['Nome', 'E-mail', 'Status', 'Inscrição', 'Check-in', ...colunasExtras]
  const linhas = inscricoes.map((i) =>
    [
      csv(i.nome),
      csv(i.email),
      csv(STATUS_LABEL[i.status]),
      csv(formatarDataHoraCurta(i.created_at)),
      csv(i.checkin_at ? formatarDataHoraCurta(i.checkin_at) : ''),
      ...colunasExtras.map((label) => csv(i.dados_extras?.[label] ?? '')),
    ].join(',')
  )

  // BOM (﻿) para o Excel reconhecer UTF-8 com acentos.
  const conteudo = '﻿' + [header.map(csv).join(','), ...linhas].join('\n')
  const nomeArquivo = `inscritos-${evento.slug}.csv`

  return new Response(conteudo, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${nomeArquivo}"`,
    },
  })
}
