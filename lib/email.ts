// Envio de e-mail transacional via Brevo (skill creden-conventions). Server-only.
// Usa a API REST diretamente com fetch — sem SDK, para não arrastar dependências
// deprecadas/vulneráveis (o @getbrevo/brevo trazia a lib 'request').

import { urlIngresso, urlQr } from './qr'

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email'

// Remetente padrão. O e-mail precisa ser de um domínio/sender verificado no Brevo.
const FROM_EMAIL = process.env.BREVO_FROM_EMAIL ?? 'ingressos@seu-dominio.com.br'
const FROM_NAME = process.env.BREVO_FROM_NAME ?? 'Creden'

// Headers que sinalizam ao Gmail/Outlook "e-mail transacional legítimo", não
// promoção: List-Unsubscribe bem-formado (mailto do próprio remetente) +
// Precedence. Ajudam a sair da aba Promoções — sem substituir domínio próprio,
// que é o fix definitivo. O mailto aponta pro remetente; o cliente registra o
// opt-out no Brevo, e a checagem de blocklist antes do envio cobre o resto.
const HEADERS_TRANSACIONAL: Record<string, string> = {
  'List-Unsubscribe': `<mailto:${FROM_EMAIL}?subject=unsubscribe>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  'X-Priority': '3',
}

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

  // QR servido por URL pública (rota /api/qr): Gmail/Outlook bloqueiam
  // <img src="data:..."> e o Brevo não referencia attachment por cid.
  const qrSrc = urlQr(p.token)
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
        <tr><td style="background:#16302E;border-radius:16px 16px 0 0;padding:24px 28px">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;color:#8fb3ad;text-transform:uppercase">Inscrição confirmada</div>
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#ffffff;font-weight:bold;margin-top:6px;line-height:1.25">${escapar(p.nomeEvento)}</div>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#c7d6d3;margin-top:12px;line-height:1.5">${escapar(p.dataEvento)}${localLinha}</div>
        </td></tr>

        <tr><td style="background:#FBF8F1;line-height:0"><div style="border-top:2px dashed #E4DFD4">&nbsp;</div></td></tr>

        <tr><td style="background:#FBF8F1;border-radius:0 0 16px 16px;padding:28px;text-align:center">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1C1B18;line-height:1.5">Olá, <strong>${escapar(p.nomeParticipante)}</strong>. Apresente este QR code na entrada:</div>
          <img src="${qrSrc}" width="220" height="220" alt="QR code do ingresso" style="display:block;margin:18px auto;border:8px solid #ffffff;border-radius:12px">
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
      headers: HEADERS_TRANSACIONAL,
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

/**
 * Verifica se um e-mail está na blocklist transacional do Brevo (bounce, spam
 * ou "descadastrar"). O Brevo aceita o envio (201) mas descarta silenciosamente
 * quem está bloqueado — por isso checamos antes de prometer entrega ao dono.
 * Retorna o motivo (string) se bloqueado, ou null se livre.
 * Em caso de falha na consulta, retorna null (não bloqueia o fluxo por isso).
 */
export async function motivoBloqueio(email: string): Promise<string | null> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return null

  const url = `https://api.brevo.com/v3/smtp/blockedContacts?limit=1&email=${encodeURIComponent(email)}`
  try {
    const res = await fetch(url, { headers: { 'api-key': apiKey, accept: 'application/json' } })
    if (!res.ok) return null
    const dados = (await res.json()) as {
      contacts?: { reason?: { message?: string; code?: string } }[]
    }
    const c = dados.contacts?.[0]
    if (!c) return null
    return c.reason?.message ?? c.reason?.code ?? 'bloqueado'
  } catch {
    return null
  }
}

interface EnviarConviteParams {
  para: string
  nomeEvento: string
  papel: 'editor' | 'checkin'
  token: string
}

/** Convite para co-organizar um evento. Link leva a /convite/[token]. */
export async function enviarConvite(p: EnviarConviteParams) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) throw new Error('BREVO_API_KEY não configurada.')

  const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const link = `${base}/convite/${p.token}`
  const papelRotulo = p.papel === 'editor' ? 'editor (gerencia o evento)' : 'check-in (portaria)'

  // Layout de "carta", não de peça de marketing: o Gmail classifica pelo
  // conteúdo, não só pelo remetente. Card colorido + botão-pílula + tabela =
  // sinal de promoção → Promoções. Texto corrido, fundo branco e link discreto
  // tendem à caixa Principal. (Testado: o mesmo remetente cai na Principal com
  // HTML simples e em Promoções com o bilhete verde.) Diferente do ingresso, que
  // é esperado — chega logo após a inscrição, então o Gmail o mantém na Principal
  // mesmo com o card. O convite chega frio, então precisa ser sóbrio.
  const htmlContent = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:16px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1C1B18;font-size:15px;line-height:1.6">
  <p>Olá,</p>
  <p>Você foi convidado para ajudar a organizar <strong>${escapar(p.nomeEvento)}</strong> como <strong>${escapar(papelRotulo)}</strong>.</p>
  <p>Para aceitar, acesse este link:<br>
  <a href="${link}" style="color:#0E5C56">${link}</a></p>
  <p style="color:#6B675E;font-size:13px">Se você não esperava este convite, é só ignorar este e-mail.</p>
  <p style="color:#6B675E;font-size:13px">— Equipe Creden</p>
</body></html>`

  const res = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { email: FROM_EMAIL, name: FROM_NAME },
      to: [{ email: p.para }],
      subject: `Convite para organizar ${p.nomeEvento}`,
      htmlContent,
      textContent: `Você foi convidado para organizar "${p.nomeEvento}" como ${papelRotulo}. Aceite em: ${link}`,
      headers: HEADERS_TRANSACIONAL,
      tags: ['convite'],
    }),
  })
  if (!res.ok) {
    const detalhe = await res.text().catch(() => '')
    throw new Error(`Brevo falhou (${res.status}): ${detalhe}`)
  }
  return res.json() as Promise<{ messageId: string }>
}
