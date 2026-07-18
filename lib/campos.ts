import { CampoExtra } from '@/types'

/**
 * Nome e e-mail são coletados sempre, mas ficam na mesma lista dos campos
 * extras para que o organizador possa reordená-los livremente. Eles têm ids
 * reservados e flag `fixo`; não são editáveis nem removíveis.
 */
export const CAMPO_NOME: CampoExtra = {
  id: 'nome',
  label: 'Nome completo',
  tipo: 'texto',
  obrigatorio: true,
  fixo: 'nome',
}
export const CAMPO_EMAIL: CampoExtra = {
  id: 'email',
  label: 'E-mail',
  tipo: 'texto',
  obrigatorio: true,
  fixo: 'email',
}

/**
 * Garante que nome e e-mail existam na lista, preservando a ordem já escolhida.
 * Se um deles faltar (evento antigo, sem os fixos gravados), entra no topo na
 * ordem nome → e-mail. Os fixos existentes são normalizados para os valores
 * canônicos (label/tipo não podem ter sido alterados).
 */
export function comCamposFixos(campos: CampoExtra[]): CampoExtra[] {
  const lista = (campos ?? []).map((c) =>
    c.fixo === 'nome' ? CAMPO_NOME : c.fixo === 'email' ? CAMPO_EMAIL : c,
  )
  const temNome = lista.some((c) => c.fixo === 'nome')
  const temEmail = lista.some((c) => c.fixo === 'email')
  const prefixo: CampoExtra[] = []
  if (!temNome) prefixo.push(CAMPO_NOME)
  if (!temEmail) prefixo.push(CAMPO_EMAIL)
  return [...prefixo, ...lista]
}

/** Move o item do índice `i` uma posição para `dir` (-1 sobe, +1 desce). */
export function mover<T>(itens: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir
  if (j < 0 || j >= itens.length) return itens
  const copia = [...itens]
  ;[copia[i], copia[j]] = [copia[j], copia[i]]
  return copia
}
