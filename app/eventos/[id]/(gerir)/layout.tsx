import { notFound } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase'
import { Evento } from '@/types'
import { AbasEvento } from '../AbasEvento'

// Layout das telas de gestão do evento (Evento · Programação · Gerenciamento).
// Carrega o cabeçalho comum e a barra de abas; cada aba renderiza como children.
// Check-in fica FORA deste grupo (tela cheia de câmera), sem cabeçalho/abas.
export default async function GerirLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { id: string }
}) {
  const supabase = await createServerSupabase()
  const { data: evento } = await supabase
    .from('eventos')
    .select('id, nome')
    .eq('id', params.id)
    .single()

  if (!evento) notFound()
  const ev = evento as Pick<Evento, 'id' | 'nome'>

  return (
    <div className="max-w-[1080px] mx-auto px-7 py-8 pb-20">
      <div className="text-muted text-sm mb-4">
        <a href="/dashboard" className="hover:text-ink">
          ← Meus eventos
        </a>
      </div>
      <h1 className="font-display text-3xl font-semibold text-secondary leading-tight break-words">
        {ev.nome}
      </h1>

      <AbasEvento id={ev.id} />

      {children}
    </div>
  )
}
