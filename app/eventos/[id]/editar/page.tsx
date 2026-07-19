import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase'
import { Evento } from '@/types'
import { EventoForm } from '../../EventoForm'

// Edição do evento (/eventos/[id]/editar). A aba "Evento" (raiz) mostra o
// resumo read-only; o botão "Editar" leva aqui. RLS filtra por dono; a guarda
// vira 404.
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
  const ev = evento as Evento

  return (
    <div className="max-w-[1080px] mx-auto px-7 py-8 pb-20">
      <div className="text-muted text-sm mb-4">
        <a href={`/eventos/${ev.id}`} className="hover:text-ink">
          ← Voltar ao evento
        </a>
      </div>
      <h1 className="font-display text-3xl font-semibold text-secondary leading-tight break-words">
        Editar evento
      </h1>
      <p className="text-muted mt-2 mb-7">
        Atualize os dados — a página pública é atualizada automaticamente.
      </p>
      <EventoForm modo="editar" evento={ev} />
    </div>
  )
}
