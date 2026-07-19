// Tipos de domínio do Creden. Centralizados aqui (convenção creden-conventions).

export type InscricaoStatus = 'inscrito' | 'presente' | 'cancelado'

/** Tipo de um campo extra do formulário de inscrição definido pelo organizador. */
export type CampoExtraTipo = 'texto' | 'numero' | 'opcoes' | 'cpf' | 'telefone'

export interface CampoExtra {
  id: string
  label: string
  tipo: CampoExtraTipo
  obrigatorio: boolean
  /** Para tipo 'opcoes' */
  opcoes?: string[]
  /**
   * Campos nativos (nome/e-mail). Ficam na mesma lista de campos_extras para
   * poderem ser reordenados junto, mas não são editáveis nem removíveis. O
   * form público renderiza um input próprio para eles (e-mail com type email).
   */
  fixo?: 'nome' | 'email'
}

export type TipoSessao = 'palestra' | 'minicurso' | 'servico' | 'outro'

export interface Sessao {
  id: string
  hora_inicio: string // 'HH:MM'
  hora_fim: string // 'HH:MM'
  titulo: string
  tipo: TipoSessao
  tipo_outro: string | null // rótulo livre quando tipo === 'outro'
  palestrante: string | null
  local: string | null
  vagas_max: number | null // null = ilimitado
  sem_inscricao: boolean // true = intervalo/pausa; não selecionável pelo participante
}

/** Grupo nomeado de sessões dentro de um dia (opcional). */
export interface Categoria {
  id: string
  titulo: string
  sessoes: Sessao[]
}

/**
 * Um dia do cronograma. As sessões podem ficar soltas (`sessoes`) ou agrupadas
 * em categorias nomeadas (`categorias`) — categoria é opcional.
 */
export interface Dia {
  id: string
  data: string // 'YYYY-MM-DD'
  sessoes: Sessao[] // sessões soltas, sem categoria
  categorias: Categoria[] // grupos nomeados
}

export interface Evento {
  id: string
  user_id: string // organizador dono (auth.users.id)
  nome: string
  descricao: string | null
  data_hora: string // ISO timestamp (UTC); interpretado/exibido no `fuso`
  fuso: string // fuso IANA do evento (ex: America/Sao_Paulo); default Brasília
  local: string | null
  vagas_max: number | null
  valor: number // 0 = grátis (em centavos se pago)
  slug: string // usado em /e/[slug]
  imagem_url: string | null // URL pública da capa no Storage; null = gradiente
  cor_capa: string // cor de fundo atrás da capa (hex); default #FFFFFF
  campos_extras: CampoExtra[] // jsonb no banco
  dias: Dia[] // cronograma (jsonb no banco): dias -> (sessões soltas + categorias)
  /** Início da janela de inscrição (ISO). Null = aberto desde sempre. */
  inscricoes_abrem_em: string | null
  /** Fim da janela de inscrição (ISO, inclusivo). Null = sem prazo. */
  inscricoes_fecham_em: string | null
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

export type PapelColaborador = 'editor' | 'checkin'

export interface Colaborador {
  id: string
  evento_id: string
  email: string
  user_id: string | null
  papel: PapelColaborador
  status: 'pendente' | 'ativo' | 'recusado'
  token: string
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
