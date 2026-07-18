import { describe, it, expect, afterEach, vi } from 'vitest'
import { origemPublica, hostPublico } from './url'

const ENV = process.env.NEXT_PUBLIC_APP_URL

afterEach(() => {
  process.env.NEXT_PUBLIC_APP_URL = ENV
  vi.unstubAllGlobals()
})

describe('no servidor (sem window)', () => {
  it('usa NEXT_PUBLIC_APP_URL e remove barra final', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://creden-eosin.vercel.app/'
    expect(origemPublica()).toBe('https://creden-eosin.vercel.app')
    expect(hostPublico()).toBe('creden-eosin.vercel.app')
  })

  it('sem env vira string vazia', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    expect(origemPublica()).toBe('')
    expect(hostPublico()).toBe('')
  })
})

describe('no cliente (com window)', () => {
  it('prefere a origem real do navegador, ignorando o env', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://prod.example.com'
    vi.stubGlobal('window', { location: { origin: 'http://localhost:3010' } })
    expect(origemPublica()).toBe('http://localhost:3010')
    expect(hostPublico()).toBe('localhost:3010')
  })
})
