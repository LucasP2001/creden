// Envio de e-mail transacional via Brevo (skill creden-conventions). Server-only.
// Usa a API REST diretamente com fetch — sem SDK, para não arrastar dependências
// deprecadas/vulneráveis (o @getbrevo/brevo trazia a lib 'request').

import { gerarQrBase64, urlIngresso } from './qr'

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

  // QR como anexo inline (cid): Gmail/Outlook bloqueiam <img src="data:...">.
  const qrBase64 = await gerarQrBase64(p.token, '#FBF8F1')
  const link = urlIngresso(p.token)
  const localLinha = p.local ? `<br>${escapar(p.local)}` : ''

  // Template "Bilhete": canhoto verde escuro + picote + QR no creme. Montado com
  // <table> (o único layout confiável entre clientes de e-mail).
  const htmlContent = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F1EA">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">Seu ingresso para ${escapar(p.nomeEvento)} — apresente o QR na entrada.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EA;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:100%">
        <tr><td style="padding:0 4px 16px;font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#16302E;font-weight:bold">Creden</td></tr>

        <tr><td style="background:#16302E;border-radius:16px 16px 0 0;padding:24px 28px">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;color:#8fb3ad;text-transform:uppercase">Inscrição confirmada</div>
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#ffffff;font-weight:bold;margin-top:6px;line-height:1.25">${escapar(p.nomeEvento)}</div>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#c7d6d3;margin-top:12px;line-height:1.5">${escapar(p.dataEvento)}${localLinha}</div>
        </td></tr>

        <tr><td style="background:#FBF8F1;line-height:0"><div style="border-top:2px dashed #E4DFD4">&nbsp;</div></td></tr>

        <tr><td style="background:#FBF8F1;border-radius:0 0 16px 16px;padding:28px;text-align:center">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1B18;line-height:1.5">Olá, <strong>${escapar(p.nomeParticipante)}</strong>. Apresente este QR code na entrada:</div>
          <img src="cid:qr-ingresso" width="220" height="220" alt="QR code do ingresso" style="display:block;margin:18px auto;border:8px solid #ffffff;border-radius:12px">
          <a href="${link}" style="display:inline-block;background:#0E5C56;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;padding:13px 28px;border-radius:999px;text-decoration:none">Abrir meu ingresso</a>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6B675E;margin-top:16px">Guarde este e-mail — o QR é o seu ingresso.</div>
        </td></tr>

        <tr><td style="padding:16px 4px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9a958a;text-align:center">Enviado por Creden · inscrição e entrada sem complicação</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  const textContent = `Inscrição confirmada!

Olá, ${p.nomeParticipante}. Seu ingresso para "${p.nomeEvento}" está pronto.
${p.dataEvento}${p.local ? ` · ${p.local}` : ''}

Abra seu ingresso e apresente o QR code na entrada:
${link}`

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
      textContent,
      // O QR viaja embedado; o cid no HTML (cid:qr-ingresso) casa com o name.
      attachment: [{ content: qrBase64, name: 'qr-ingresso.png' }],
      tags: ['ingresso'],
    }),
  })

  if (!res.ok) {
    const detalhe = await res.text().catch(() => '')
    throw new Error(`Brevo falhou (${res.status}): ${detalhe}`)
  }

  return res.json() as Promise<{ messageId: string }>
}

/** Escapa texto do usuário antes de interpolar no HTML do e-mail. */
function escapar(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
