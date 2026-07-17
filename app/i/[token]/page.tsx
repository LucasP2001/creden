import Image from 'next/image'
import { createAdminSupabase } from '@/lib/supabase'
import { gerarQrDataUrl } from '@/lib/qr'
import { Evento, Inscricao } from '@/types'
import { PainelParticipante } from './PainelParticipante'
import { CardIngresso } from './CardIngresso'
import { DescricaoEvento } from './DescricaoEvento'
import { marcacoesDaInscricao, contarPorSessao } from '@/lib/marcacoes'
import { inscricoesAbertas, rotuloPeriodo } from '@/lib/periodo'
import { FUSO_BR, formatarDataHora, formatarHora } from '@/lib/datas'

/** Data do canhoto do ingresso: 'Seg, 10 de agosto · 09:00'. */
function formatarDataIngresso(iso: string): string {
  const d = new Date(iso)
  const semana = d
    .toLocaleDateString('pt-BR', { weekday: 'short', timeZone: FUSO_BR })
    .replace('.', '')
  const dia = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', timeZone: FUSO_BR })
  // Só a primeira letra: `capitalize` do CSS viraria "10 De Ago. De 2026".
  return `${semana.charAt(0).toUpperCase()}${semana.slice(1)}, ${dia} · ${formatarHora(iso)}`
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
  // Creme da superfície: o QR fica embutido no ingresso, sem caixa branca.
  const qr = await gerarQrDataUrl(insc.token, '#FBF8F1')
  const usado = insc.status === 'presente'

  const cardIngresso = (
    <CardIngresso
      qr={qr}
      nome={insc.nome}
      email={insc.email}
      usado={usado}
      token={insc.token}
      nomeEvento={ev.nome}
      dataEvento={formatarDataIngresso(ev.data_hora)}
      local={ev.local}
    />
  )

  return (
    <main className="min-h-screen bg-sand pb-24">
      {/* Topo em "palco": a capa preenche o fundo desfocada; a logo nítida
          vem sobreposta abaixo, encostando no bloco de dados. Mesmo tratamento
          da página pública, pra a identidade do evento ser a mesma nas telas. */}
      <div className="relative h-40 sm:h-48 overflow-hidden bg-secondary">
        {ev.imagem_url ? (
          <>
            <Image
              src={ev.imagem_url}
              alt=""
              aria-hidden
              fill
              priority
              sizes="100vw"
              className="object-cover scale-125 blur-2xl saturate-150"
            />
            <div className="absolute inset-0 bg-secondary/35" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-secondary via-primary to-primary-light" />
        )}
      </div>

      {ev.imagem_url && (
        <div className="max-w-[980px] mx-auto px-5 relative z-10 flex justify-center -mt-[84px] pointer-events-none">
          <div className="relative w-full max-w-[200px] aspect-[3/2] rounded-2xl overflow-hidden bg-white shadow-lift ring-1 ring-black/5">
            <Image
              src={ev.imagem_url}
              alt={`Capa de ${ev.nome}`}
              fill
              priority
              sizes="200px"
              className="object-contain p-2"
            />
          </div>
        </div>
      )}

      <div className={`max-w-[980px] mx-auto px-5 relative ${ev.imagem_url ? '-mt-10' : ''}`}>
        <div className={`pb-6 border-b border-line ${ev.imagem_url ? 'pt-14' : 'py-6'}`}>
          <p className="text-sm font-semibold text-primary">
            ✓ Inscrição confirmada, {insc.nome.split(' ')[0]}
          </p>
          <h1 className="font-display text-[clamp(1.5rem,5vw,2rem)] font-semibold text-secondary leading-tight mt-1 break-words">
            {ev.nome}
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted mt-2">
            <span>📅 {formatarDataHora(ev.data_hora)}</span>
            {ev.local && <span>📍 {ev.local}</span>}
          </div>
          {ev.descricao && <DescricaoEvento texto={ev.descricao} />}
        </div>
      </div>

      <div className="max-w-[980px] mx-auto px-5 pb-8">

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
            ingresso={<div className="lg:hidden">{cardIngresso}</div>}
            podeEditar={inscricoesAbertas(ev.inscricoes_abrem_em, ev.inscricoes_fecham_em)}
            avisoPeriodo={rotuloPeriodo(ev.inscricoes_abrem_em, ev.inscricoes_fecham_em)}
          />

          <aside className="hidden lg:block lg:sticky lg:top-8">{cardIngresso}</aside>
        </div>
      </div>
    </main>
  )
}
