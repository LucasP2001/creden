import Image from 'next/image'
import { createAdminSupabase } from '@/lib/supabase'
import { gerarQrDataUrl } from '@/lib/qr'
import { Evento, Inscricao } from '@/types'
import { PainelParticipante } from './PainelParticipante'
import { CardIngresso } from './CardIngresso'
import { DescricaoEvento } from './DescricaoEvento'
import { Cronograma } from '@/components/Cronograma'
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

  const cardIngresso = (
    <CardIngresso qr={qr} nome={insc.nome} email={insc.email} usado={usado} token={insc.token} />
  )

  return (
    <main className="min-h-screen bg-sand pb-24">
      <header className="h-14 flex items-center px-6 border-b border-line bg-surface">
        <Logo />
      </header>

      <div className="max-w-[980px] mx-auto px-5 pb-8">
        {/* Informações do evento: contexto fixo, acima das abas. */}
        <div className="card overflow-hidden min-w-0 mt-6">
          {ev.imagem_url && (
            <div className="relative h-40 w-full" style={{ backgroundColor: ev.cor_capa }}>
              <Image src={ev.imagem_url} alt={`Capa de ${ev.nome}`} fill className="object-contain" />
            </div>
          )}
          <div className="p-6">
            <p className="text-sm text-primary font-semibold">
              Sua inscrição está confirmada, {insc.nome.split(' ')[0]} 👋
            </p>
            <h1 className="font-display text-2xl font-semibold text-secondary mt-1 break-words">
              {ev.nome}
            </h1>
            <div className="text-sm text-muted mt-2 grid gap-1">
              <div>📅 {formatarData(ev.data_hora)}</div>
              {ev.local && <div>📍 {ev.local}</div>}
            </div>
            {ev.descricao && <DescricaoEvento texto={ev.descricao} />}
          </div>
        </div>

        {/* Abas: Inscrição (escolher) · Programação (consultar) · Ingresso (validar).
            No desktop o ingresso também fica fixo na lateral — na porta do evento,
            ninguém deveria caçar aba pra achar o QR. */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px] items-start">
          <PainelParticipante
            token={insc.token}
            dias={ev.dias ?? []}
            marcadasIniciais={await marcacoesDaInscricao(supabase, insc.id)}
            contagens={await contarPorSessao(supabase, ev.id)}
            nomeEvento={ev.nome}
            programacao={
              temPrograma ? (
                <div className="card p-5 sm:p-6 min-w-0">
                  <Cronograma
                    dias={ev.dias ?? []}
                    contagens={await contarPorSessao(supabase, ev.id)}
                    semTitulo
                  />
                </div>
              ) : (
                <div className="card p-6 min-w-0">
                  <p className="text-sm text-muted">Programação em breve.</p>
                </div>
              )
            }
            ingresso={<div className="lg:hidden">{cardIngresso}</div>}
          />

          <aside className="hidden lg:block lg:sticky lg:top-8">{cardIngresso}</aside>
        </div>
      </div>
    </main>
  )
}
