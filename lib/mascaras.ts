/**
 * Máscaras e validação de CPF e telefone brasileiros, usadas nos campos extras
 * do formulário de inscrição. Puras (sem DOM) para dar pra testar.
 */

/** Só os dígitos de uma string. */
export function apenasDigitos(v: string): string {
  return v.replace(/\D/g, '')
}

/** Formata progressivamente como CPF: 000.000.000-00 (corta em 11 dígitos). */
export function formatarCpf(v: string): string {
  const d = apenasDigitos(v).slice(0, 11)
  const p = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9), d.slice(9, 11)]
  let out = p[0]
  if (p[1]) out += '.' + p[1]
  if (p[2]) out += '.' + p[2]
  if (p[3]) out += '-' + p[3]
  return out
}

/**
 * Formata progressivamente como telefone brasileiro (corta em 11 dígitos):
 *  - 10 dígitos: (00) 0000-0000 (fixo)
 *  - 11 dígitos: (00) 00000-0000 (celular)
 */
export function formatarTelefone(v: string): string {
  const d = apenasDigitos(v).slice(0, 11)
  if (d.length === 0) return ''
  const ddd = d.slice(0, 2)
  const resto = d.slice(2)
  if (d.length <= 2) return `(${ddd}`
  // Celular (9 dígitos após DDD) quebra em 5+4; fixo em 4+4.
  const corte = resto.length > 4 ? (d.length > 10 ? 5 : 4) : resto.length
  const parte1 = resto.slice(0, corte)
  const parte2 = resto.slice(corte)
  return parte2 ? `(${ddd}) ${parte1}-${parte2}` : `(${ddd}) ${parte1}`
}

/** Valida CPF pelos dois dígitos verificadores (rejeita todos iguais). */
export function cpfValido(v: string): boolean {
  const d = apenasDigitos(v)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const dv = (base: string, pesoInicial: number): number => {
    let soma = 0
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i)
    const r = (soma * 10) % 11
    return r === 10 ? 0 : r
  }
  return dv(d.slice(0, 9), 10) === Number(d[9]) && dv(d.slice(0, 10), 11) === Number(d[10])
}

/** Telefone válido = 10 (fixo) ou 11 (celular) dígitos. */
export function telefoneValido(v: string): boolean {
  const n = apenasDigitos(v).length
  return n === 10 || n === 11
}

/**
 * E-mail plausível: algo@algo.algo, sem espaços. Não valida entrega — só barra
 * o erro óbvio (faltou @, faltou domínio) com feedback imediato, igual ao que o
 * servidor exige.
 */
export function emailValido(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}
