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

/**
 * Insere marcações para uma inscrição, respeitando vaga por sessão.
 * Retorna os títulos das sessões rejeitadas por lotação (para avisar o participante).
 */
export async function gravarMarcacoes(
  admin: Admin,
  eventoId: string,
  inscricaoId: string,
  sessaoIds: string[],
  sessoes: Sessao[]
): Promise<string[]> {
  if (sessaoIds.length === 0) return []
  const contagens = await contarPorSessao(admin, eventoId)
  const porId = new Map(sessoes.map((s) => [s.id, s]))
  const rejeitadas: string[] = []
  const inserir: { inscricao_id: string; evento_id: string; sessao_id: string }[] = []

  for (const id of sessaoIds) {
    const sessao = porId.get(id)
    if (!sessao) continue // id inexistente, ignora
    if (sessao.vagas_max != null && (contagens[id] ?? 0) >= sessao.vagas_max) {
      rejeitadas.push(sessao.titulo)
      continue
    }
    inserir.push({ inscricao_id: inscricaoId, evento_id: eventoId, sessao_id: id })
  }

  if (inserir.length > 0) {
    await admin.from('inscricoes_sessoes').insert(inserir)
  }
  return rejeitadas
}
