import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase'
import { Evento } from '@/types'
import { EventoForm } from '../../EventoForm'

// Editar evento (/eventos/[id]/editar). Server Component que valida dono e renderiza o form.
// RLS já filtra por dono no select; a guarda abaixo transforma "não é seu / não existe" em 404 claro.
export default async function EditarEventoPage({ params }: { params: { id: string } }) {
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
    <div className="max-w-[1080px] mx-auto px-7 py-8 pb-20">
      <div className="text-muted mb-6">
        <a href="/dashboard">← Meus eventos</a> / {(evento as Evento).nome}
      </div>
      <h1 className="text-3xl font-semibold">Editar evento</h1>
      <p className="text-muted mt-1 mb-7">
        Atualize os dados — a página pública será atualizada automaticamente.
      </p>
      <EventoForm modo="editar" evento={evento as Evento} />
    </div>
  )
}
