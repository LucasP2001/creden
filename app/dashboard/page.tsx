import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase'
import { EventCard } from '@/components/EventCard'
import { ButtonLink } from '@/components/ui/Button'
import { EventoComStats } from '@/types'
import { logout } from '@/app/auth/actions'

// Dashboard do organizador — lista de eventos. Server Component (busca no servidor).
export default async function DashboardPage() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // RLS garante que só vêm os eventos do organizador logado (auth.uid() = user_id).
  // Traz, em uma única query, a contagem total de inscrições e a de presentes por evento,
  // usando contagem de relação aninhada do PostgREST (com alias filtrado para presentes).
  const { data: eventos, error } = await supabase
    .from('eventos')
    .select('*, total:inscricoes(count), presentes:inscricoes(count)')
    .eq('presentes.status', 'presente')
    .order('data_hora', { ascending: false })

  if (error) {
    return (
      <Shell email={user?.email}>
        <p className="text-error">Não foi possível carregar seus eventos. Tente novamente.</p>
      </Shell>
    )
  }

  // PostgREST devolve a contagem como [{ count: N }]; normaliza para os campos de EventoComStats.
  type LinhaContada = Record<string, unknown> & {
    total?: { count: number }[]
    presentes?: { count: number }[]
  }
  const lista: EventoComStats[] = ((eventos ?? []) as LinhaContada[]).map((e) => ({
    ...(e as unknown as EventoComStats),
    total_inscritos: e.total?.[0]?.count ?? 0,
    total_presentes: e.presentes?.[0]?.count ?? 0,
  }))

  return (
    <Shell email={user?.email}>
      <div className="flex items-end justify-between gap-4 mb-7 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold">Meus eventos</h1>
          <p className="text-muted mt-1">
            {lista.length === 0
              ? 'Você ainda não tem eventos.'
              : `Você tem ${lista.length} evento(s).`}
          </p>
        </div>
        <ButtonLink variant="accent" href="/eventos/novo">
          ＋ Criar evento
        </ButtonLink>
      </div>

      {lista.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-[18px] [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
          {lista.map((ev) => (
            <EventCard key={ev.id} evento={ev} />
          ))}
        </div>
      )}
    </Shell>
  )
}

function EmptyState() {
  return (
    <Link
      href="/eventos/novo"
      className="card grid place-items-center min-h-[230px] text-center text-muted border-dashed hover:text-ink"
    >
      <div>
        <div className="w-12 h-12 rounded-full bg-accent text-secondary grid place-items-center text-2xl mx-auto mb-3">
          ＋
        </div>
        <strong className="text-ink">Criar seu primeiro evento</strong>
        <div className="text-[13px] mt-1">Página de inscrição em minutos</div>
      </div>
    </Link>
  )
}

function Shell({ children, email }: { children: React.ReactNode; email?: string }) {
  return (
    <div className="max-w-[1080px] mx-auto px-7 py-8 pb-20">
      <div className="flex items-center justify-between mb-6">
        <span className="text-muted">Painel do organizador</span>
        <div className="flex items-center gap-3 text-sm">
          {email && <span className="text-muted">{email}</span>}
          <form action={logout}>
            <button type="submit" className="text-primary font-semibold hover:underline">
              Sair
            </button>
          </form>
        </div>
      </div>
      {children}
    </div>
  )
}
