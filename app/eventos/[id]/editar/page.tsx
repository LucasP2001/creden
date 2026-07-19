import { notFound } from 'next/navigation'
import { createAdminSupabase } from '@/lib/supabase'
import { acessoEvento } from '@/lib/acesso'
import { Evento } from '@/types'
import { EventoForm } from '../../EventoForm'

// Edição do evento (/eventos/[id]/editar). A aba "Evento" (raiz) mostra o
// resumo read-only; o botão "Editar" leva aqui. Guarda por acessoEvento —
// exige podeEditar (dono ou colaborador 'editor'); sem isso vira 404.
export default async function EditarEventoPage({ params }: { params: { id: string } }) {
  const acesso = await acessoEvento(params.id)
  if (!acesso.podeEditar) notFound()

  const { data: evento } = await createAdminSupabase()
    .from('eventos')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!evento) notFound()
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
