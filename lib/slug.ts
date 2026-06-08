// Gera o slug da URL pública a partir do nome do evento.
// Usado no preview (client) e na criação (server) — mesma lógica nos dois lados.
export function slugify(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
