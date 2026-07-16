'use client'

// Atalho para o ingresso no mobile: rola até o card do QR.
// No desktop o ingresso já está visível na coluna lateral (sticky), então some.
export function IngressoFlutuante() {
  return (
    <button
      type="button"
      onClick={() => document.getElementById('ingresso')?.scrollIntoView({ behavior: 'smooth' })}
      className="lg:hidden fixed bottom-4 right-4 z-20 h-12 pl-4 pr-5 rounded-pill bg-secondary text-white font-semibold text-sm shadow-lift flex items-center gap-2"
    >
      <span aria-hidden>🎟</span> Meu ingresso
    </button>
  )
}
