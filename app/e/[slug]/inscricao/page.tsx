import { createServerSupabase } from '@/lib/supabase'
import { Evento } from '@/types'
import { InscricaoForm } from './InscricaoForm'
import { Logo } from '@/components/Logo'

// Formulário de inscrição (/e/[slug]/inscricao). Público.
export default async function InscricaoPage({ params }: { params: { slug: string } }) {
  const supabase = await createServerSupabase()
  const { data: evento } = await supabase
    .from('eventos')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!evento) {
    return <div className="min-h-screen grid place-items-center">Evento não encontrado.</div>
  }

  const ev = evento as Evento

  return (
    <main className="min-h-screen">
      <header className="h-14 flex items-center px-6 border-b border-line bg-surface">
        <Logo />
      </header>
      <div className="max-w-[520px] mx-auto px-5 py-10">
        <a href={`/e/${ev.slug}`} className="text-muted text-sm">← Voltar ao evento</a>
        <h1 className="font-display text-3xl font-semibold mt-3">Fazer inscrição</h1>
        <p className="text-muted mt-1 mb-7">{ev.nome}</p>
        <InscricaoForm slug={ev.slug} camposExtras={ev.campos_extras ?? []} />
      </div>
    </main>
  )
}
