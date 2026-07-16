import Link from 'next/link'
import { Logo } from '@/components/Logo'

// Landing page pública do Creden — vende a plataforma para organizadores.
export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden">
      <SiteHeader />
      <Hero />
      <ComoFunciona />
      <Recursos />
      <Precos />
      <CtaFinal />
      <Rodape />
    </main>
  )
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 h-16 border-b border-line bg-sand/80 backdrop-blur">
      <Logo />
      <div className="flex items-center gap-3">
        <Link href="/login" className="text-sm font-semibold text-secondary hover:text-primary">
          Entrar
        </Link>
        <Link href="/login" className="btn btn-primary !py-2.5">
          Criar evento
        </Link>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative bg-grid">
      <div className="max-w-6xl mx-auto px-6 pt-20 pb-16 grid lg:grid-cols-2 gap-12 items-center">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-pill bg-surface border border-line text-primary text-[13px] font-semibold px-3 py-1">
            🌿 Inscrição + check-in sem complicação
          </span>
          <h1 className="font-display text-[clamp(2.4rem,5vw,3.6rem)] font-semibold text-secondary leading-[1.05] mt-5">
            Eventos que respiram <em className="not-italic text-accent-hover font-display italic">tranquilidade</em>.
          </h1>
          <p className="mt-5 text-lg text-muted max-w-md">
            Crie a página do seu evento, receba inscrições e faça check-in lendo o QR code
            com a câmera do celular. O participante recebe o ingresso por e-mail.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="btn btn-accent btn-lg">
              Começar grátis →
            </Link>
            <Link href="/e/exemplo" className="btn btn-secondary btn-lg">
              Ver um evento
            </Link>
          </div>
          <p className="mt-5 text-sm text-muted">
            Sem cartão para testar · cancele quando quiser
          </p>
        </div>

        {/* Mock visual: card de evento + ingresso flutuando */}
        <div className="relative h-[380px] hidden lg:block">
          <HeroMock />
        </div>
      </div>
    </section>
  )
}

function HeroMock() {
  return (
    <div className="absolute inset-0">
      {/* Card de evento */}
      <div className="absolute left-0 top-6 w-72 card overflow-hidden shadow-lift animate-fade-up">
        <div className="h-20 bg-gradient-to-br from-primary to-primary-light" />
        <div className="p-4">
          <h3 className="font-display text-lg font-semibold">Workshop de Cerâmica</h3>
          <p className="text-xs text-muted mt-1">📅 18 jun, 14h · Ateliê Barro Fino</p>
          <div className="flex gap-5 mt-4">
            <div>
              <div className="font-display text-2xl font-semibold text-secondary leading-none">142</div>
              <div className="text-[11px] text-muted">inscritos</div>
            </div>
            <div>
              <div className="font-display text-2xl font-semibold text-success leading-none">63%</div>
              <div className="text-[11px] text-muted">check-in</div>
            </div>
          </div>
          <div className="h-1.5 bg-status-inscrito-bg rounded-pill overflow-hidden mt-3">
            <div className="h-full bg-success rounded-pill" style={{ width: '63%' }} />
          </div>
        </div>
      </div>

      {/* Ingresso flutuante */}
      <div className="absolute right-0 bottom-0 w-56 bg-surface rounded-[20px] shadow-lift overflow-hidden animate-float">
        <div className="bg-primary text-white px-4 py-3 flex items-center justify-between">
          <Logo variant="dark" className="text-sm" />
        </div>
        <div className="p-4 text-center">
          <div className="w-28 h-28 mx-auto rounded-xl border border-line grid place-items-center bg-white">
            <QrMini />
          </div>
          <div className="mt-2 text-xs font-semibold text-success">● Válido</div>
          <div className="font-display text-sm font-semibold mt-1">Marina Alves</div>
        </div>
      </div>
    </div>
  )
}

function QrMini() {
  return (
    <svg viewBox="0 0 100 100" className="w-24 h-24" aria-hidden="true">
      <rect width="100" height="100" fill="#fff" />
      <g fill="#16302E">
        <path d="M8 8h24v24H8zM12 12v16h16V12z M16 16h8v8h-8z" />
        <path d="M68 8h24v24H68zM72 12v16h16V12z M76 16h8v8h-8z" />
        <path d="M8 68h24v24H8zM12 72v16h16V72z M16 76h8v8h-8z" />
        <rect x="40" y="10" width="6" height="6" /><rect x="52" y="10" width="6" height="6" />
        <rect x="40" y="40" width="6" height="6" /><rect x="56" y="44" width="6" height="6" />
        <rect x="44" y="56" width="6" height="6" /><rect x="68" y="52" width="6" height="6" />
        <rect x="80" y="60" width="6" height="6" /><rect x="60" y="68" width="6" height="6" />
        <rect x="72" y="76" width="6" height="6" /><rect x="84" y="84" width="6" height="6" />
        <rect x="48" y="84" width="6" height="6" /><rect x="40" y="72" width="6" height="6" />
      </g>
    </svg>
  )
}

function ComoFunciona() {
  const passos = [
    { n: '1', t: 'Crie a página', d: 'Nome, data, local e vagas. A URL pública é gerada na hora.' },
    { n: '2', t: 'Receba inscrições', d: 'Compartilhe o link. Cada inscrito recebe o ingresso com QR por e-mail.' },
    { n: '3', t: 'Faça o check-in', d: 'Na porta, leia o QR com a câmera. Entrada confirmada em segundos.' },
  ]
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <div className="text-center max-w-xl mx-auto">
        <h2 className="font-display text-3xl font-semibold">Do convite à entrada, sem planilha</h2>
        <p className="text-muted mt-3">Três passos. Nenhum deles envolve papel.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6 mt-12">
        {passos.map((p) => (
          <div key={p.n} className="card p-7">
            <div className="w-11 h-11 rounded-pill bg-accent text-secondary font-display font-bold text-xl grid place-items-center">
              {p.n}
            </div>
            <h3 className="font-display text-xl font-semibold mt-4">{p.t}</h3>
            <p className="text-muted text-sm mt-2 leading-relaxed">{p.d}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function Recursos() {
  const itens = [
    { i: '🔗', t: 'Página pública pronta', d: 'Compartilhável e bonita, sem precisar de site.' },
    { i: '📋', t: 'Campos personalizados', d: 'Peça instituição, CPF, tamanho de camiseta — o que precisar.' },
    { i: '📷', t: 'Check-in por QR', d: 'Câmera do celular, feedback grande e busca por nome.' },
    { i: '📊', t: 'Inscritos em tempo real', d: 'Veja quem inscreveu e quem entrou. Exporte em CSV.' },
    { i: '✉️', t: 'Ingresso por e-mail', d: 'O participante recebe o QR automaticamente.' },
    { i: '🇧🇷', t: 'Feito pro Brasil', d: 'Em português, pensado para cursos, workshops e eventos culturais.' },
  ]
  return (
    <section className="bg-secondary text-white py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="font-display text-3xl font-semibold text-white">Tudo que a portaria precisa</h2>
          <p className="text-white/70 mt-3">E nada que atrapalhe.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10 rounded-lg overflow-hidden mt-12">
          {itens.map((it) => (
            <div key={it.t} className="bg-secondary p-7">
              <div className="text-2xl">{it.i}</div>
              <h3 className="font-display text-lg font-semibold mt-3 text-white">{it.t}</h3>
              <p className="text-white/60 text-sm mt-1.5 leading-relaxed">{it.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Precos() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <div className="card max-w-md mx-auto p-8 text-center shadow-lift border-primary/20">
        <span className="badge badge-inscrito">Plano único</span>
        <div className="mt-5 flex items-end justify-center gap-1">
          <span className="font-display text-5xl font-semibold text-secondary">R$99</span>
          <span className="text-muted mb-1.5">/mês</span>
        </div>
        <p className="text-muted text-sm mt-2">Eventos ilimitados. Inscritos ilimitados.</p>
        <ul className="text-left text-sm mt-6 space-y-2.5">
          {['Páginas de inscrição ilimitadas', 'Check-in por QR code', 'Ingresso por e-mail', 'Exportação em CSV', 'Campos personalizados'].map((f) => (
            <li key={f} className="flex items-center gap-2.5">
              <span className="text-success">✓</span> {f}
            </li>
          ))}
        </ul>
        <Link href="/login" className="btn btn-accent btn-lg w-full justify-center mt-7">
          Começar agora
        </Link>
        <p className="text-xs text-muted mt-3">Gratuito para participantes, sempre.</p>
      </div>
    </section>
  )
}

function CtaFinal() {
  return (
    <section className="bg-grid">
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="font-display text-[clamp(2rem,4vw,3rem)] font-semibold text-secondary leading-tight">
          Seu próximo evento merece uma entrada tranquila.
        </h2>
        <Link href="/login" className="btn btn-primary btn-lg mt-8 inline-flex">
          Criar meu primeiro evento →
        </Link>
      </div>
    </section>
  )
}

function Rodape() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Logo />
        <p className="text-sm text-muted">Inscrição e entrada sem complicação.</p>
        <Link href="/login" className="text-sm font-semibold text-primary hover:underline">
          Entrar →
        </Link>
      </div>
    </footer>
  )
}
