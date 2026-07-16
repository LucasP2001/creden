import { Logo } from '@/components/Logo'
import { ReenviarBotao } from './ReenviarBotao'

interface Props {
  qr: string
  nome: string
  email: string
  usado: boolean
  token: string
}

// Card do ingresso com QR. Usado na aba "Ingresso" (mobile) e na coluna lateral (desktop).
export function CardIngresso({ qr, nome, email, usado, token }: Props) {
  return (
    <div>
      <div className="bg-surface rounded-[24px] overflow-hidden shadow-lift">
        <div className="bg-primary text-white px-6 py-4 flex items-center justify-between">
          <Logo variant="dark" />
          <span className="text-xs opacity-85">INGRESSO</span>
        </div>
        <div
          className={`flex items-center justify-center gap-2 font-bold text-sm py-2.5 ${
            usado ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success'
          }`}
        >
          ● {usado ? 'Já utilizado' : 'Válido'}
        </div>
        <div className="px-6 pt-6 pb-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qr}
            alt="QR code do ingresso"
            width={200}
            height={200}
            className="mx-auto rounded-2xl border border-line p-3 bg-white"
          />
          <div className="font-display text-lg font-semibold mt-3 break-words">{nome}</div>
          <div className="text-muted text-sm break-words">{email}</div>
        </div>
        <div className="bg-status-inscrito-bg text-primary text-center font-semibold text-sm py-3">
          📲 Apresente esta tela na entrada
        </div>
      </div>
      <ReenviarBotao token={token} email={email} />
    </div>
  )
}
