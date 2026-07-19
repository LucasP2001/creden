import { describe, it, expect, afterEach } from 'vitest'
import { enviarConvite } from './email'

const ENV_APP_URL = process.env.NEXT_PUBLIC_APP_URL
const ENV_API_KEY = process.env.BREVO_API_KEY

afterEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = ENV_APP_URL
  process.env.BREVO_API_KEY = ENV_API_KEY
})

describe('enviarConvite', () => {
  it('lança se BREVO_API_KEY não estiver configurada (não chama a Brevo)', async () => {
    delete process.env.BREVO_API_KEY
    await expect(
      enviarConvite({ para: 'a@b.com', nomeEvento: 'Evento X', papel: 'editor', token: 'a'.repeat(32) })
    ).rejects.toThrow('BREVO_API_KEY não configurada.')
  })

  it('monta o link do convite com /convite/ e o token, no HTML e no texto', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://creden-eosin.vercel.app'
    process.env.BREVO_API_KEY = 'chave-fake'

    const token = 'abcdef0123456789abcdef0123456789'
    const linkEsperado = 'https://creden-eosin.vercel.app/convite/' + token

    let corpoCapturado: any = null
    const fetchOriginal = global.fetch
    global.fetch = (async (_url: unknown, init?: RequestInit) => {
      corpoCapturado = JSON.parse(String(init?.body))
      return {
        ok: true,
        json: async () => ({ messageId: 'msg-1' }),
      } as Response
    }) as typeof fetch

    try {
      await enviarConvite({ para: 'convidado@example.com', nomeEvento: 'Semana da Ciência', papel: 'checkin', token })
    } finally {
      global.fetch = fetchOriginal
    }

    expect(corpoCapturado).not.toBeNull()
    expect(corpoCapturado.htmlContent).toContain(linkEsperado)
    expect(corpoCapturado.textContent).toContain(linkEsperado)
    expect(corpoCapturado.htmlContent).toContain('/convite/')
  })
})
