// Onda que fecha o "palco" (hero desfocado) e emenda no fundo do conteúdo.
// Curva em S descendo na diagonal — dá movimento sem competir com a logo.
// Fica ancorada na base do hero (o hero é relative). A cor deve ser a do fundo
// logo abaixo (sand, por padrão) para parecer que o conteúdo "invade" a faixa.
//
// Sobre a curva, uma faixa de gradiente `sand` (transparente -> sólido) dissolve
// a borda contra o gradiente verde do hero — sem ela, o anti-aliasing deixava um
// "risco" fino e nítido no topo da onda (visível sobretudo no mobile).
export function OndaPalco({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 375 60"
      preserveAspectRatio="none"
      aria-hidden
      className={`absolute inset-x-0 bottom-[-1px] w-full h-[60px] z-[1] ${className}`}
    >
      <defs>
        {/* #F4F1EA = cor `sand` do tema (tailwind.config). SVG não lê classes. */}
        <linearGradient id="onda-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F4F1EA" stopOpacity="0" />
          <stop offset="100%" stopColor="#F4F1EA" stopOpacity="1" />
        </linearGradient>
      </defs>
      {/* Faixa de fade acima da curva: dilui a fronteira verde/areia. */}
      <path
        d="M0,60 L0,22 C120,18 150,42 260,40 C320,39 350,34 375,32 L375,60 Z"
        fill="url(#onda-fade)"
      />
      {/* Onda sólida (a mesma curva, um pouco mais baixa). */}
      <path
        d="M0,60 L0,30 C120,26 150,50 260,48 C320,47 350,42 375,40 L375,60 Z"
        className="fill-sand"
      />
    </svg>
  )
}
