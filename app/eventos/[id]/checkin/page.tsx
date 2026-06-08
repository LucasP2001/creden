import { CheckinClient } from './CheckinClient'

// Tela de check-in (/eventos/[id]/checkin). A leitura de câmera é client.
export default function CheckinPage({ params }: { params: { id: string } }) {
  return <CheckinClient eventoId={params.id} />
}
