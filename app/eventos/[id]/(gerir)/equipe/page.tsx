import { notFound } from 'next/navigation'
import { createAdminSupabase } from '@/lib/supabase'
import { acessoEvento } from '@/lib/acesso'
import { Colaborador } from '@/types'
import { Equipe } from './Equipe'

// Aba "Equipe" (/eventos/[id]/equipe): convidar/listar/revogar colaboradores.
// Dono e editor podem ver e convidar; só o dono revoga (podeRevogar).
export default async function EquipePage({ params }: { params: { id: string } }) {
  const acesso = await acessoEvento(params.id)
  if (!acesso.podeEditar) notFound()

  const { data: colaboradores } = await createAdminSupabase()
    .from('colaboradores')
    .select('*')
    .eq('evento_id', params.id)
    .order('created_at')

  return (
    <Equipe
      eventoId={params.id}
      colaboradores={(colaboradores ?? []) as Colaborador[]}
      podeRevogar={acesso.ehDono}
    />
  )
}
