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
