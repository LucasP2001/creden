import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase'
import { Evento } from '@/types'
import { EventoForm } from '../../EventoForm'

// Aba "Evento" (/eventos/[id]): ver e editar os dados. O cabeçalho e as abas
// vêm do layout do grupo (gerir). RLS filtra por dono; a guarda vira 404.
export default async function EventoAbaPage({ params }: { params: { id: string } }) {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: evento } = await supabase
    .from('eventos')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!evento || (evento as Evento).user_id !== user.id) notFound()

  return (
    <>
      <p className="text-muted -mt-2 mb-7">
        Atualize os dados — a página pública é atualizada automaticamente.
      </p>
      <EventoForm modo="editar" evento={evento as Evento} />
    </>
  )
}
