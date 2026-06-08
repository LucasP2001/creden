import type { Metadata } from 'next'
import { Fraunces, Be_Vietnam_Pro } from 'next/font/google'
import './globals.css'

// Tipografia da marca (skill creden-design): Fraunces (display) + Be Vietnam Pro (corpo).
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})
const bodyFont = Be_Vietnam_Pro({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Creden — Inscrição e entrada sem complicação',
  description:
    'Crie páginas de inscrição, gerencie participantes e faça check-in via QR code no dia do evento.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${bodyFont.variable}`}>
      <body>{children}</body>
    </html>
  )
}
