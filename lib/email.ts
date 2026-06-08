// Envio de e-mail transacional via Brevo (skill creden-conventions). Server-only.
// Usa a API REST diretamente com fetch — sem SDK, para não arrastar dependências
// deprecadas/vulneráveis (o @getbrevo/brevo trazia a lib 'request').

import { gerarQrDataUrl, urlIngresso } from './qr'

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email'

// Remetente padrão. O e-mail precisa ser de um domínio/sender verificado no Brevo.
const FROM_EMAIL = process.env.BREVO_FROM_EMAIL ?? 'ingressos@seu-dominio.com.br'
const FROM_NAME = process.env.BREVO_FROM_NAME ?? 'Creden'

interface EnviarIngressoParams {
  para: string
  nomeParticipante: string
  nomeEvento: string
  dataEvento: string // já formatada, ex: "18 jun 2026, 14h"
  local: string
  token: string
}

/**
 * Envia o ingresso digital com QR code por e-mail após a inscrição.
 * Tom acolhedor (skill creden-design — fala com o participante).
 * Lança em caso de falha — quem chama decide como tratar.
 */
export async function enviarIngresso(p: EnviarIngressoParams) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) throw new Error('BREVO_API_KEY não configurada.')

  const qr = await gerarQrDataUrl(p.token)
  const link = urlIngresso(p.token)

  // TODO: extrair para um template HTML caprichado (alinhado ao mockup do ingresso).
  const htmlContent = `
    <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;color:#1C1B18">
      <h1 style="color:#16302E">Inscrição confirmada! 🎟️</h1>
      <p>Olá, ${p.nomeParticipante}. Seu ingresso para <strong>${p.nomeEvento}</strong> está pronto.</p>
      <p style="text-align:center"><img src="${qr}" alt="QR code do ingresso" width="240" height="240" /></p>
      <p><strong>${p.dataEvento}</strong><br/>${p.local}</p>
      <p style="text-align:center">
        <a href="${link}" style="background:#0E5C56;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none">Abrir meu ingresso</a>
      </p>
      <p style="color:#6B675E;font-size:13px">Apresente o QR code na entrada — é só isso.</p>
    </div>
  `

  const res = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: FROM_EMAIL, name: FROM_NAME },
      to: [{ email: p.para, name: p.nomeParticipante }],
      subject: `Seu ingresso para ${p.nomeEvento}`,
      htmlContent,
      textContent: `Inscrição confirmada! Seu ingresso para ${p.nomeEvento} (${p.dataEvento}, ${p.local}): ${link}`,
      tags: ['ingresso'],
    }),
  })

  if (!res.ok) {
    const detalhe = await res.text().catch(() => '')
    throw new Error(`Brevo falhou (${res.status}): ${detalhe}`)
  }

  return res.json() as Promise<{ messageId: string }>
}
