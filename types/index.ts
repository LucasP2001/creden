// Tipos de domínio do Creden. Centralizados aqui (convenção creden-conventions).

export type InscricaoStatus = 'inscrito' | 'presente' | 'cancelado'

/** Tipo de um campo extra do formulário de inscrição definido pelo organizador. */
export type CampoExtraTipo = 'texto' | 'numero' | 'opcoes'

export interface CampoExtra {
  id: string
  label: string
  tipo: CampoExtraTipo
  obrigatorio: boolean
  /** Para tipo 'opcoes' */
  opcoes?: string[]
}

export type TipoSessao = 'palestra' | 'minicurso' | 'servico' | 'outro'

export interface Sessao {
  id: string
  dia: string // 'YYYY-MM-DD'
  hora_inicio: string // 'HH:MM'
  hora_fim: string // 'HH:MM'
  titulo: string
  tipo: TipoSessao
  tipo_outro: string | null // rótulo livre quando tipo === 'outro'
  palestrante: string | null
  local: string | null
  vagas_max: number | null // null = ilimitado
}

export interface Evento {
  id: string
  user_id: string // organizador dono (auth.users.id)
  nome: string
  descricao: string | null
  data_hora: string // ISO timestamp
  local: string | null
  vagas_max: number | null
  valor: number // 0 = grátis (em centavos se pago)
  slug: string // usado em /e/[slug]
  imagem_url: string | null // URL pública da capa no Storage; null = gradiente
  cor_capa: string // cor de fundo atrás da capa (hex); default #FFFFFF
  campos_extras: CampoExtra[] // jsonb no banco
  sessoes: Sessao[] // cronograma (jsonb no banco)
  created_at: string
  updated_at: string
}

export interface Inscricao {
  id: string
  evento_id: string
  nome: string
  email: string
  dados_extras: Record<string, string> // jsonb — respostas dos campos_extras
  status: InscricaoStatus
  token: string // usado em /i/[token]
  checkin_at: string | null
  created_at: string
  updated_at: string
}

/** Usuário organizador (deriva de auth.users do Supabase). */
export interface User {
  id: string
  email: string
}

/** Resultado de uma tentativa de check-in (tela /eventos/[id]/checkin). */
export type CheckinResultado =
  | { tipo: 'sucesso'; nome: string }
  | { tipo: 'invalido' }
  | { tipo: 'repetido'; nome: string; hora: string }

/** Evento + contadores agregados, para o dashboard. */
export interface EventoComStats extends Evento {
  total_inscritos: number
  total_presentes: number
}
