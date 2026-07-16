import type { Sessao } from '@/types'
import type { createAdminSupabase } from '@/lib/supabase'

type Admin = ReturnType<typeof createAdminSupabase>

/** Ids das sessões existentes. Puro. */
export function idsDeSessoes(sessoes: Sessao[]): string[] {
  return sessoes.map((s) => s.id)
}

/** Apaga marcações cujo sessao_id não existe mais no cronograma do evento. */
export async function limparOrfaos(
  admin: Admin,
  eventoId: string,
  sessoes: Sessao[]
): Promise<void> {
  const validos = idsDeSessoes(sessoes)
  if (validos.length === 0) {
    await admin.from('inscricoes_sessoes').delete().eq('evento_id', eventoId)
    return
  }
  const lista = validos.map((id) => `"${id}"`).join(',')
  await admin
    .from('inscricoes_sessoes')
    .delete()
    .eq('evento_id', eventoId)
    .not('sessao_id', 'in', `(${lista})`)
}

/** Conta marcações por sessao_id no evento. */
export async function contarPorSessao(
  admin: Admin,
  eventoId: string
): Promise<Record<string, number>> {
  const { data } = await admin
    .from('inscricoes_sessoes')
    .select('sessao_id')
    .eq('evento_id', eventoId)
  const mapa: Record<string, number> = {}
  for (const row of data ?? []) {
    const id = (row as { sessao_id: string }).sessao_id
    mapa[id] = (mapa[id] ?? 0) + 1
  }
  return mapa
}
