// Ícones dos metadados do evento (data, local, inscrições, valor).
// SVG traçado em vez de emoji: emoji renderiza diferente por SO (iOS colorido,
// Android/Windows outro desenho), e o design do Creden pede marcadores próprios.
// currentColor herda a cor do container — o círculo verde-claro dos metadados.

type Nome = 'calendario' | 'local' | 'ingresso' | 'valor'

const paths: Record<Nome, React.ReactNode> = {
  calendario: (
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      <path d="M3 9h18M8 2.5v4M16 2.5v4" />
    </>
  ),
  local: (
    <>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  ingresso: (
    <>
      <path d="M3 9.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" />
      <path d="M15 7.5v9" strokeDasharray="1.5 2" />
    </>
  ),
  valor: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
      <path d="M2.5 10h19" />
    </>
  ),
}

export function MetaIcon({ nome, className }: { nome: Nome; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {paths[nome]}
    </svg>
  )
}
