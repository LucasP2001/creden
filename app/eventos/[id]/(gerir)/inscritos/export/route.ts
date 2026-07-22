import ExcelJS from 'exceljs'
import { createServerSupabase } from '@/lib/supabase'
import { formatarDataHoraCurta } from '@/lib/datas'
import { sessoesDoEvento } from '@/lib/sessoes'
import { Evento, Inscricao } from '@/types'

// Export XLSX dos inscritos de um evento (/eventos/[id]/inscritos/export).
// Server-side; RLS garante que só quem tem acesso ao evento recebe os dados.
// Uma aba "Inscritos": dados do inscrito + 1 coluna por sessão (Sim/vazio).

const STATUS_LABEL: Record<Inscricao['status'], string> = {
  inscrito: 'Inscrito',
  presente: 'Presente',
  cancelado: 'Cancelado',
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createServerSupabase()

  const [{ data: eventoRow }, { data: inscricoesRows }, { data: marcacoesRows }] = await Promise.all([
    supabase.from('eventos').select('*').eq('id', params.id).single(),
    supabase
      .from('inscricoes')
      .select('*')
      .eq('evento_id', params.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('inscricoes_sessoes')
      .select('inscricao_id, sessao_id')
      .eq('evento_id', params.id),
  ])

  if (!eventoRow) {
    return new Response('Evento não encontrado.', { status: 404 })
  }

  const evento = eventoRow as Evento
  const inscricoes = (inscricoesRows ?? []) as Inscricao[]
  const marcacoes = (marcacoesRows ?? []) as { inscricao_id: string; sessao_id: string }[]

  // sessao_id marcados por inscrito, para lookup O(1).
  const marcadasPorInscrito = new Map<string, Set<string>>()
  for (const m of marcacoes) {
    const set = marcadasPorInscrito.get(m.inscricao_id) ?? new Set<string>()
    set.add(m.sessao_id)
    marcadasPorInscrito.set(m.inscricao_id, set)
  }

  const colunasExtras = (evento.campos_extras ?? []).filter((c) => !c.fixo).map((c) => c.label)
  const sessoes = sessoesDoEvento(evento.dias ?? [])

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Creden'
  const ws = workbook.addWorksheet('Inscritos', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  // Chaves de coluna: fixas + extras (prefixo p/ não colidir) + sessões (id).
  ws.columns = [
    { header: 'Nome', key: 'nome', width: 28 },
    { header: 'E-mail', key: 'email', width: 30 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Inscrição', key: 'inscricao', width: 18 },
    { header: 'Check-in', key: 'checkin', width: 18 },
    ...colunasExtras.map((label, idx) => ({ header: label, key: `extra_${idx}`, width: 22 })),
    ...sessoes.map((s) => ({ header: s.titulo, key: `sessao_${s.id}`, width: 20 })),
  ]

  for (const i of inscricoes) {
    const marcadas = marcadasPorInscrito.get(i.id) ?? new Set<string>()
    const linha: Record<string, string> = {
      nome: i.nome,
      email: i.email,
      status: STATUS_LABEL[i.status],
      inscricao: formatarDataHoraCurta(i.created_at),
      checkin: i.checkin_at ? formatarDataHoraCurta(i.checkin_at) : '',
    }
    colunasExtras.forEach((label, idx) => {
      linha[`extra_${idx}`] = i.dados_extras?.[label] ?? ''
    })
    for (const s of sessoes) {
      linha[`sessao_${s.id}`] = marcadas.has(s.id) ? 'Sim' : ''
    }
    ws.addRow(linha)
  }

  // Estilo do header: negrito, texto branco, fundo cor da marca.
  const header = ws.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E5C56' } }
  header.alignment = { vertical: 'middle' }
  header.height = 20

  const buffer = await workbook.xlsx.writeBuffer()
  const nomeArquivo = `inscritos-${evento.slug}.xlsx`

  return new Response(buffer, {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="${nomeArquivo}"`,
    },
  })
}
