import { redirect } from 'next/navigation'

// A edição virou a aba raiz do evento (/eventos/[id]). Mantemos /editar como
// redirect para não quebrar links e bookmarks antigos.
export default function EditarRedirect({ params }: { params: { id: string } }) {
  redirect(`/eventos/${params.id}`)
}
