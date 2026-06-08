import Link from 'next/link'
import { Logo } from '@/components/Logo'

// Landing page pública. TODO: caprichar a copy/seções de marketing.
export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between px-6 h-16 border-b border-line bg-surface">
        <Logo />
        <Link href="/login" className="btn btn-secondary">
          Entrar
        </Link>
      </header>

      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h1 className="font-display text-5xl font-semibold text-secondary leading-tight">
          Inscrição e entrada sem complicação
        </h1>
        <p className="mt-5 text-lg text-muted max-w-xl mx-auto">
          Crie a página do seu evento, receba inscrições e faça check-in lendo o QR code
          com a câmera do celular. O participante recebe o ingresso por e-mail.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link href="/login" className="btn btn-accent btn-lg">
            Começar agora
          </Link>
          <Link href="/e/exemplo" className="btn btn-secondary btn-lg">
            Ver um evento
          </Link>
        </div>
        <p className="mt-6 text-sm text-muted">R$99/mês para organizadores · gratuito para participantes</p>
      </section>
    </main>
  )
}
