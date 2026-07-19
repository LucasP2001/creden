// Convites pendentes de um e-mail que ainda não têm user_id vinculado.
export function convitesParaReivindicar(linhas: { id: string; user_id: string | null }[]): string[] {
  return linhas.filter((l) => l.user_id === null).map((l) => l.id)
}
