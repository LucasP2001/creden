import { notFound } from 'next/navigation'
import { acessoEvento } from '@/lib/acesso'
import { CheckinClient } from './CheckinClient'

// Tela de check-in (/eventos/[id]/checkin). A leitura de câmera é client.
// Guarda por acessoEvento — dono ou colaborador (editor/checkin) podem
// fazer check-in; sem acesso vira 404.
export default async function CheckinPage({ params }: { params: { id: string } }) {
  const acesso = await acessoEvento(params.id)
  if (!acesso.podeVer) notFound()

  return <CheckinClient eventoId={params.id} />
}
