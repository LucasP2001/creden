// Logo do Creden: símbolo (ticket + check) + wordmark "Creden".
// Variantes de cor para fundo claro (padrão) e escuro.

interface LogoProps {
  variant?: 'light' | 'dark' // 'light' = sobre fundo claro; 'dark' = sobre fundo escuro
  className?: string
  symbolOnly?: boolean
}

export function Logo({ variant = 'light', className = '', symbolOnly = false }: LogoProps) {
  const ticket = variant === 'dark' ? '#3BA89E' : '#0E5C56'
  const word = variant === 'dark' ? '#F4F1EA' : '#16302E'

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Symbol ticket={ticket} />
      {!symbolOnly && (
        <span className="font-display font-semibold text-[1.25em] leading-none" style={{ color: word }}>
          Creden
        </span>
      )}
    </span>
  )
}

function Symbol({ ticket }: { ticket: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path
        d="M14 12 H50 a6 6 0 0 1 6 6 V26 a5 5 0 0 0 0 12 V46 a6 6 0 0 1 -6 6 H14 a6 6 0 0 1 -6 -6 V38 a5 5 0 0 0 0 -12 V18 a6 6 0 0 1 6 -6 Z"
        fill={ticket}
      />
      <path
        d="M22 33 L29 40 L44 24"
        stroke="#F5B14C"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
