import Image from 'next/image'
import { createAdminSupabase } from '@/lib/supabase'
import { gerarQrDataUrl } from '@/lib/qr'
import { Evento, Inscricao } from '@/types'
import { ReenviarBotao } from './ReenviarBotao'
import { Logo } from '@/components/Logo'

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Ingresso digital (/i/[token]). Público — quem tem o token vê o ingresso.
export default async function IngressoPage({ params }: { params: { token: string } }) {
  // Lê no servidor com service_role, filtrando pelo token. Assim o anônimo nunca
  // consulta a tabela direto (ver aviso em supabase/schema.sql).
  const supabase = createAdminSupabase()
  const { data: inscricao } = await supabase
    .from('inscricoes')
    .select('*, eventos(*)')
    .eq('token', params.token)
    .single()

  if (!inscricao) {
    return (
      <div className="min-h-screen grid place-items-center bg-secondary text-white text-center px-6">
        <div>
          <h1 className="font-display text-2xl">Ingresso não encontrado</h1>
          <p className="opacity-80 mt-2">Verifique o link recebido por e-mail.</p>
        </div>
      </div>
    )
  }

  const insc = inscricao as Inscricao & { eventos: Evento }
  const ev = insc.eventos
  const qr = await gerarQrDataUrl(insc.token)
  const usado = insc.status === 'presente'

  return (
    <div className="min-h-screen grid place-items-center bg-secondary p-6">
      <div>
        <div className="w-[min(380px,94vw)] bg-surface rounded-[24px] overflow-hidden shadow-lift">
          <div className="bg-primary text-white px-6 py-5 flex items-center justify-between">
            <Logo variant="dark" />
            <span className="text-xs opacity-85">INGRESSO</span>
          </div>

          {ev.imagem_url && (
            <div className="relative h-28 w-full">
              <Image src={ev.imagem_url} alt={`Capa de ${ev.nome}`} fill className="object-cover" />
            </div>
          )}

          <div
            className={`flex items-center justify-center gap-2 font-bold text-sm py-2.5 ${
              usado ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success'
            }`}
          >
            ● {usado ? 'Já utilizado' : 'Válido'}
          </div>

          <div className="px-6 pt-7 pb-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr}
              alt="QR code do ingresso"
              width={210}
              height={210}
              className="mx-auto rounded-2xl border border-line p-3 bg-white"
            />
          </div>

          <div className="px-7 pb-2 text-center">
            <h1 className="font-display text-2xl font-semibold">{ev.nome}</h1>
            <div className="text-muted text-[15px] mt-1">{insc.nome}</div>
          </div>

          <div className="px-7 py-2">
            <Row k="Data" v={formatarData(ev.data_hora)} />
            {ev.local && <Row k="Local" v={ev.local} />}
            <Row k="Participante" v={insc.nome} />
          </div>

          <div className="bg-status-inscrito-bg text-primary text-center font-semibold text-sm py-4">
            📲 Apresente esta tela na entrada
          </div>
        </div>

        <ReenviarBotao token={insc.token} email={insc.email} />
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-line last:border-0 text-sm">
      <span className="text-muted">{k}</span>
      <span className="font-semibold text-right">{v}</span>
    </div>
  )
}
