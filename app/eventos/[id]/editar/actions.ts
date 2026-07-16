'use server'

export interface AtualizarEventoResult {
  ok: boolean
  erro?: string
}

// Stub temporário — implementação real na Task 5.
export async function atualizarEvento(
  _eventoId: string,
  _formData: FormData
): Promise<AtualizarEventoResult> {
  return { ok: false, erro: 'Não implementado.' }
}
