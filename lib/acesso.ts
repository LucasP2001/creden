// Acesso de um usuário a um evento: dono ou colaborador (editor/checkin).
// resolverAcesso é pura (testável). acessoEvento faz o I/O no servidor.
import { createServerSupabase, createAdminSupabase } from './supabase'
import { PapelColaborador } from '@/types'

export interface AcessoEvento {
  ehDono: boolean
  papel: PapelColaborador | null
  podeVer: boolean
  podeEditar: boolean
}

/** Deriva as permissões a partir de "é dono?" e do papel do colaborador. */
export function resolverAcesso(ehDono: boolean, papel: PapelColaborador | null): AcessoEvento {
  const podeVer = ehDono || papel !== null
  const podeEditar = ehDono || papel === 'editor'
  return { ehDono, papel, podeVer, podeEditar }
}

/**
 * Contexto de acesso do usuário logado a um evento. Lê dono (RLS) e o papel do
 * colaborador (admin, filtrando por evento+user). Retorna acesso "vazio" se não
 * houver usuário.
 */
export async function acessoEvento(eventoId: string): Promise<AcessoEvento & { userId: string | null }> {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ...resolverAcesso(false, null), userId: null }

  const admin = createAdminSupabase()
  const { data: ev } = await admin
    .from('eventos')
    .select('user_id')
    .eq('id', eventoId)
    .maybeSingle()
  const ehDono = !!ev && (ev as { user_id: string }).user_id === user.id

  let papel: PapelColaborador | null = null
  if (!ehDono) {
    const { data: col } = await admin
      .from('colaboradores')
      .select('papel, status')
      .eq('evento_id', eventoId)
      .eq('user_id', user.id)
      .eq('status', 'ativo')
      .maybeSingle()
    papel = col ? (col as { papel: PapelColaborador }).papel : null
  }

  return { ...resolverAcesso(ehDono, papel), userId: user.id }
}
