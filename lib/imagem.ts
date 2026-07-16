// Validação de imagem de capa — compartilhada entre o client (ImageUpload)
// e as server actions. Uma fonte de verdade para tipos/tamanho.

export const IMAGEM_TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp']
export const IMAGEM_TAMANHO_MAX = 5 * 1024 * 1024 // 5 MB

/** Retorna mensagem de erro (pt-BR) ou null se a imagem é válida. */
export function validarImagem(file: { type: string; size: number }): string | null {
  if (!IMAGEM_TIPOS_ACEITOS.includes(file.type)) {
    return 'Use uma imagem JPG, PNG ou WEBP.'
  }
  if (file.size > IMAGEM_TAMANHO_MAX) {
    return 'A imagem deve ter no máximo 5 MB.'
  }
  return null
}

/** Extensão de arquivo a partir do mime type. Assume tipo já validado. */
export function extensaoImagem(type: string): string {
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  return 'jpg'
}

/**
 * Cores de fundo da capa (atrás da imagem, quando ela não cobre tudo).
 * Presets da marca + branco. Valores hex batem com a paleta (tailwind.config).
 */
export const CORES_CAPA = [
  { nome: 'Transparente', valor: 'transparent' },
  { nome: 'Branco', valor: '#FFFFFF' },
  { nome: 'Areia', valor: '#F4F1EA' },
  { nome: 'Verde petróleo', valor: '#0E5C56' },
  { nome: 'Verde claro', valor: '#3BA89E' },
  { nome: 'Âmbar', valor: '#F5B14C' },
  { nome: 'Grafite', valor: '#16302E' },
] as const

export const COR_CAPA_PADRAO = '#FFFFFF'

/** Retorna a cor se for um preset válido; senão a cor padrão. */
export function corCapaValida(valor: string | null | undefined): string {
  const ok = CORES_CAPA.some((c) => c.valor === valor)
  return ok ? (valor as string) : COR_CAPA_PADRAO
}
