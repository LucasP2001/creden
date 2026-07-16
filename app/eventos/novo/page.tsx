import { EventoForm } from '../EventoForm'

// Criar evento (/eventos/novo). A página é Server Component; o form é client (estado).
export default function NovoEventoPage() {
  return (
    <div className="max-w-[1080px] mx-auto px-7 py-8 pb-20">
      <div className="text-muted mb-6">
        <a href="/dashboard">← Meus eventos</a> / Novo evento
      </div>
      <h1 className="text-3xl font-semibold">Criar evento</h1>
      <p className="text-muted mt-1 mb-7">
        Preencha os dados — a página pública é gerada automaticamente.
      </p>
      <EventoForm modo="criar" />
    </div>
  )
}
