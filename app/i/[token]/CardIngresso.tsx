import { ReenviarBotao } from './ReenviarBotao'
import { MetaIcon } from '@/components/MetaIcon'

interface Props {
  qr: string
  nome: string
  email: string
  usado: boolean
  token: string
  nomeEvento: string
  dataEvento: string
  local?: string | null
}

/**
 * Ingresso com QR. Formato de bilhete: canhoto escuro com o evento em cima,
 * picote, e o QR como protagonista embaixo — é o que se apresenta na porta.
 */
export function CardIngresso({
  qr,
  nome,
  email,
  usado,
  token,
  nomeEvento,
  dataEvento,
  local,
}: Props) {
  return (
    <div>
      <div className="relative rounded-[24px] shadow-lift overflow-hidden">
        {/* Canhoto escuro: dá peso ao bilhete e separa do fundo creme da página. */}
        <div className="bg-secondary px-6 pt-5 pb-6">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
              Ingresso
            </span>
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-pill ${
                usado ? 'bg-warning/20 text-warning' : 'bg-accent/20 text-accent'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden />
              {usado ? 'Já utilizado' : 'Válido'}
            </span>
          </div>

          <div className="font-display text-lg font-semibold text-white leading-snug break-words mt-3">
            {nomeEvento}
          </div>
          <div className="text-xs text-white/70 mt-1.5">{dataEvento}</div>
          {local && (
            <div className="text-xs text-white/70 mt-0.5 break-words inline-flex items-start gap-1.5">
              <MetaIcon nome="local" className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {local}
            </div>
          )}
        </div>

        {/* Vinco entre o canhoto e o QR: um tracejado sobre a faixa creme.
            (Semicírculos "mordendo" as laterais foram tentados e não sobrevivem
            ao overflow-hidden do card — o tracejado sozinho já lê como bilhete.) */}
        <div
          className="h-7 bg-surface"
          aria-hidden
          style={{
            backgroundImage: 'repeating-linear-gradient(to right, #D8D2C4 0 6px, transparent 6px 12px)',
            backgroundSize: 'calc(100% - 44px) 2px',
            backgroundPosition: '22px 50%',
            backgroundRepeat: 'repeat-x',
          }}
        />

        {/* QR — protagonista */}
        <div className="bg-surface px-6 pt-3 pb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qr}
            alt="QR code do ingresso"
            width={280}
            height={280}
            className={`mx-auto w-full max-w-[240px] h-auto ${usado ? 'opacity-40 grayscale' : ''}`}
          />

          <div className="font-display text-xl font-semibold text-secondary mt-3 break-words leading-tight">
            {nome}
          </div>
          <div className="text-xs text-muted break-words mt-0.5">{email}</div>

          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted/45 mt-5">
            creden
          </div>
        </div>
      </div>

      <ReenviarBotao token={token} email={email} />
    </div>
  )
}
