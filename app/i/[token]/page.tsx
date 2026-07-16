import Image from 'next/image'
import { createAdminSupabase } from '@/lib/supabase'
import { gerarQrDataUrl } from '@/lib/qr'
import { Evento, Inscricao } from '@/types'
import { ReenviarBotao } from './ReenviarBotao'
import { SessoesEditor } from './SessoesEditor'
import { marcacoesDaInscricao, contarPorSessao } from '@/lib/marcacoes'
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

// Página do participante (/i/[token]). Pública — quem tem o token (link do e-mail) acessa.
// Mostra a inscrição, o ingresso com QR, os dados do evento e o cronograma onde o
// participante escolhe as palestras.
export default async function ParticipantePage({ params }: { params: { token: string } }) {
  // Lê no servidor com service_role, filtrando pelo token (o anônimo nunca consulta direto).
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
          <h1 className="font-display text-2xl">Inscrição não encontrada</h1>
          <p className="opacity-80 mt-2">Verifique o link recebido por e-mail.</p>
        </div>
      </div>
    )
  }

  const insc = inscricao as Inscricao & { eventos: Evento }
  const ev = insc.eventos
  const qr = await gerarQrDataUrl(insc.token)
  const usado = insc.status === 'presente'
  const temPrograma = (ev.dias ?? []).length > 0

  return (
    <main className="min-h-screen bg-sand">
      <header className="h-14 flex items-center px-6 border-b border-line bg-surface">
        <Logo />
      </header>

      <div className="max-w-[980px] mx-auto px-5 py-8 grid gap-6 lg:grid-cols-[1fr_340px] items-start">
        {/* Coluna principal: evento + programação */}
        <div className="grid gap-6 order-2 lg:order-1">
          <div className="card overflow-hidden">
            {ev.imagem_url && (
              <div className="relative h-40 w-full" style={{ backgroundColor: ev.cor_capa }}>
                <Image src={ev.imagem_url} alt={`Capa de ${ev.nome}`} fill className="object-contain" />
              </div>
            )}
            <div className="p-6">
              <h1 className="font-display text-2xl font-semibold text-secondary">{ev.nome}</h1>
              <div className="text-sm text-muted mt-2 grid gap-1">
                <div>📅 {formatarData(ev.data_hora)}</div>
                {ev.local && <div>📍 {ev.local}</div>}
              </div>
              {ev.descricao && (
                <p className="text-[15px] leading-relaxed text-[#3a3833] whitespace-pre-line mt-4">
                  {ev.descricao}
                </p>
              )}
            </div>
          </div>

          {temPrograma && (
            <div className="card p-6">
              <h2 className="font-display text-xl font-semibold">Escolha suas palestras</h2>
              <p className="text-sm text-muted mt-1 mb-4">
                Marque as sessões que você vai participar. Você pode voltar aqui e alterar quando quiser.
              </p>
              <SessoesEditor
                token={insc.token}
                dias={ev.dias ?? []}
                marcadasIniciais={await marcacoesDaInscricao(supabase, insc.id)}
                contagens={await contarPorSessao(supabase, ev.id)}
              />
            </div>
          )}
        </div>

        {/* Coluna lateral: ingresso com QR */}
        <aside className="order-1 lg:order-2 lg:sticky lg:top-8">
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
              <div className="font-display text-lg font-semibold mt-3">{insc.nome}</div>
              <div className="text-muted text-sm">{insc.email}</div>
            </div>
            <div className="bg-status-inscrito-bg text-primary text-center font-semibold text-sm py-3">
              📲 Apresente esta tela na entrada
            </div>
          </div>
          <ReenviarBotao token={insc.token} email={insc.email} />
        </aside>
      </div>
    </main>
  )
}
