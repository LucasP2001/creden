// Onda que fecha o "palco" (hero desfocado) e emenda no fundo do conteúdo.
// Curva em S descendo na diagonal — dá movimento sem competir com a logo.
// Fica ancorada na base do hero (o hero é relative). A cor deve ser a do fundo
// logo abaixo (sand, por padrão) para parecer que o conteúdo "invade" a faixa.
export function OndaPalco({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 375 44"
      preserveAspectRatio="none"
      aria-hidden
      className={`absolute inset-x-0 bottom-[-1px] w-full h-11 z-[1] ${className}`}
    >
      <path
        d="M0,44 L0,14 C120,10 150,34 260,32 C320,31 350,26 375,24 L375,44 Z"
        className="fill-sand"
      />
    </svg>
  )
}
