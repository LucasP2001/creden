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
