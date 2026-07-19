import { NextRequest } from 'next/server'
import { gerarQrBase64, tokenValido } from '@/lib/qr'

// PNG público do QR de um ingresso, por token. Existe para o e-mail: clientes
// como Gmail bloqueiam <img src="data:..."> e o Brevo não referencia attachment
// por cid de forma confiável, então o QR é servido por URL e embutido com <img>.
// O token já é público (vai na URL /i/[token]); o QR só o codifica, sem segredo.
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token
  if (!tokenValido(token)) {
    return new Response('Token inválido', { status: 404 })
  }

  const base64 = await gerarQrBase64(token, '#FFFFFF')
  const buffer = Buffer.from(base64, 'base64')

  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      // Imutável: o QR de um token nunca muda. Cache agressivo (cliente + CDN).
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
