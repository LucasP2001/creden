// Base pública do app. O preview da URL do evento precisa refletir o ambiente
// real (localhost em dev, domínio da Vercel em preview/prod), não um domínio
// fixo. No navegador, a fonte de verdade é a própria origem; no servidor, cai
// no NEXT_PUBLIC_APP_URL configurado.

/** Origem pública com protocolo, ex.: 'https://creden-eosin.vercel.app'. */
export function origemPublica(): string {
  if (typeof window !== 'undefined') return window.location.origin
  return (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '')
}

/** Só o host (sem protocolo), para exibir: 'creden-eosin.vercel.app'. */
export function hostPublico(): string {
  return origemPublica().replace(/^https?:\/\//, '')
}
