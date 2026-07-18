// Geração e validação de token do ingresso + geração de QR code (skill creden-conventions).
// O QR carrega o token; o check-in valida o token contra a tabela inscricoes.

import { randomUUID } from 'crypto'
import QRCode from 'qrcode'

/**
 * Gera um token único para o ingresso. Vai no QR code e na URL /i/[token].
 * Server-only (usa crypto). Chame ao criar a inscrição.
 */
export function gerarToken(): string {
  // UUID v4 sem hífens — curto o bastante e não-sequencial (não dá pra adivinhar).
  return randomUUID().replace(/-/g, '')
}

/** URL pública do ingresso a partir do token. */
export function urlIngresso(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return `${base}/i/${token}`
}

/**
 * Gera um QR code como data URL (PNG base64), pronto para <img src=...> ou e-mail.
 * O conteúdo do QR é o token (o leitor no check-in lê o token e valida no banco).
 */
export async function gerarQrDataUrl(
  token: string,
  /**
   * Cor de fundo do QR. Deve ser a do fundo onde ele será exibido, senão o código
   * vira uma caixa recortada. Default branco (e-mail herda o fundo do cliente);
   * na tela do ingresso, passe o creme da superfície.
   */
  fundo = '#FFFFFF'
): Promise<string> {
  return QRCode.toDataURL(token, {
    // Renderizado em até 240px CSS: 640 cobre telas 2x sem borrar.
    width: 640,
    margin: 1,
    color: { dark: '#16302E', light: fundo }, // cores da marca
    errorCorrectionLevel: 'M',
  })
}

/**
 * QR como base64 puro (sem prefixo data:), para anexo inline (cid) no e-mail.
 * Clientes como Gmail/Outlook bloqueiam <img src="data:...">, então o QR vai
 * embedado como attachment e é referenciado por cid no HTML.
 */
export async function gerarQrBase64(token: string, fundo = '#FFFFFF'): Promise<string> {
  const buf = await QRCode.toBuffer(token, {
    width: 640,
    margin: 1,
    color: { dark: '#16302E', light: fundo },
    errorCorrectionLevel: 'M',
  })
  return buf.toString('base64')
}

/** Validação básica do formato do token lido pela câmera, antes de bater no banco. */
export function tokenValido(raw: string): boolean {
  return /^[a-f0-9]{32}$/.test(raw.trim())
}
