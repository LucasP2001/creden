// Fusos horários do Brasil. O organizador quase sempre cai no detectado do
// dispositivo; o select existe para corrigir (ex: criou o evento viajando).

export const FUSO_PADRAO = 'America/Sao_Paulo'

/** Fusos do Brasil, do mais a leste (UTC-2) ao mais a oeste (UTC-5). */
export const FUSOS_BR: { valor: string; rotulo: string }[] = [
  { valor: 'America/Noronha', rotulo: 'Fernando de Noronha (UTC-2)' },
  { valor: 'America/Sao_Paulo', rotulo: 'Brasília (UTC-3)' },
  { valor: 'America/Manaus', rotulo: 'Manaus (UTC-4)' },
  { valor: 'America/Cuiaba', rotulo: 'Cuiabá (UTC-4)' },
  { valor: 'America/Porto_Velho', rotulo: 'Porto Velho (UTC-4)' },
  { valor: 'America/Boa_Vista', rotulo: 'Boa Vista (UTC-4)' },
  { valor: 'America/Rio_Branco', rotulo: 'Rio Branco (UTC-5)' },
]

/**
 * Valida um fuso vindo do cliente (não confiar no form). Aceita qualquer fuso
 * IANA que o runtime reconheça; se não reconhecer ou vier vazio, cai no padrão.
 * Aceitar além da lista BR cobre organizador criando de fora do país.
 */
export function fusoValido(bruto: string | null | undefined): string {
  const v = String(bruto ?? '').trim()
  if (!v) return FUSO_PADRAO
  try {
    // Lança RangeError se o fuso for inválido.
    new Intl.DateTimeFormat('en-US', { timeZone: v })
    return v
  } catch {
    return FUSO_PADRAO
  }
}
