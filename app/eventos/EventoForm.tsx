'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ImageUpload } from '@/components/ImageUpload'
import { CampoExtra, CampoExtraTipo, Evento, Dia, Categoria, Sessao, TipoSessao } from '@/types'
import { novoDia, novaCategoria, novaSessao } from '@/lib/sessoes'
import { comCamposFixos, mover } from '@/lib/campos'
import { slugify } from '@/lib/slug'
import { criarEvento } from './novo/actions'
import { atualizarEvento } from './[id]/editar/actions'

interface Props {
  modo: 'criar' | 'editar'
  evento?: Evento
}

const novoCampo = (): CampoExtra => ({
  id: crypto.randomUUID(),
  label: '',
  tipo: 'texto',
  obrigatorio: false,
})

// Converte ISO -> valor aceito por <input type="datetime-local"> (YYYY-MM-DDTHH:mm) no fuso local.
function paraDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16)
}

export function EventoForm({ modo, evento }: Props) {
  const [nome, setNome] = useState(evento?.nome ?? '')
  const [valorPago, setValorPago] = useState((evento?.valor ?? 0) > 0)
  // Nome e e-mail entram na lista como campos fixos (reordenáveis, não editáveis).
  const [campos, setCampos] = useState<CampoExtra[]>(comCamposFixos(evento?.campos_extras ?? []))
  const [dias, setDias] = useState<Dia[]>(evento?.dias ?? [])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const slug = useMemo(() => (evento ? evento.slug : slugify(nome) || 'meu-evento'), [nome, evento])

  function atualizarCampo(id: string, patch: Partial<CampoExtra>) {
    setCampos((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  // Opções do tipo "opcoes": lista editável por campo.
  function atualizarOpcao(campoId: string, i: number, valor: string) {
    setCampos((cs) =>
      cs.map((c) =>
        c.id === campoId
          ? { ...c, opcoes: (c.opcoes ?? []).map((o, j) => (j === i ? valor : o)) }
          : c,
      ),
    )
  }
  function adicionarOpcao(campoId: string) {
    setCampos((cs) =>
      cs.map((c) => (c.id === campoId ? { ...c, opcoes: [...(c.opcoes ?? []), ''] } : c)),
    )
  }
  function removerOpcao(campoId: string, i: number) {
    setCampos((cs) =>
      cs.map((c) =>
        c.id === campoId ? { ...c, opcoes: (c.opcoes ?? []).filter((_, j) => j !== i) } : c,
      ),
    )
  }

  // Helpers imutáveis. mapDia aplica fn ao dia certo; mapCat idem à categoria.
  function mapDia(diaId: string, fn: (d: Dia) => Dia) {
    setDias((ds) => ds.map((d) => (d.id === diaId ? fn(d) : d)))
  }
  function atualizarDia(diaId: string, patch: Partial<Dia>) {
    mapDia(diaId, (d) => ({ ...d, ...patch }))
  }
  function removerDia(diaId: string) {
    setDias((ds) => ds.filter((d) => d.id !== diaId))
  }
  function addCategoria(diaId: string) {
    mapDia(diaId, (d) => ({ ...d, categorias: [...d.categorias, novaCategoria()] }))
  }
  function atualizarCategoria(diaId: string, catId: string, patch: Partial<Categoria>) {
    mapDia(diaId, (d) => ({
      ...d,
      categorias: d.categorias.map((c) => (c.id === catId ? { ...c, ...patch } : c)),
    }))
  }
  function removerCategoria(diaId: string, catId: string) {
    mapDia(diaId, (d) => ({ ...d, categorias: d.categorias.filter((c) => c.id !== catId) }))
  }
  // Sessão vive solta no dia (catId null) ou dentro de uma categoria (catId).
  function addSessao(diaId: string, catId: string | null) {
    mapDia(diaId, (d) =>
      catId == null
        ? { ...d, sessoes: [...d.sessoes, novaSessao()] }
        : {
            ...d,
            categorias: d.categorias.map((c) =>
              c.id === catId ? { ...c, sessoes: [...c.sessoes, novaSessao()] } : c
            ),
          }
    )
  }
  function atualizarSessao(diaId: string, catId: string | null, sid: string, patch: Partial<Sessao>) {
    const upd = (ss: Sessao[]) => ss.map((s) => (s.id === sid ? { ...s, ...patch } : s))
    mapDia(diaId, (d) =>
      catId == null
        ? { ...d, sessoes: upd(d.sessoes) }
        : { ...d, categorias: d.categorias.map((c) => (c.id === catId ? { ...c, sessoes: upd(c.sessoes) } : c)) }
    )
  }
  function removerSessao(diaId: string, catId: string | null, sid: string) {
    const del = (ss: Sessao[]) => ss.filter((s) => s.id !== sid)
    mapDia(diaId, (d) =>
      catId == null
        ? { ...d, sessoes: del(d.sessoes) }
        : { ...d, categorias: d.categorias.map((c) => (c.id === catId ? { ...c, sessoes: del(c.sessoes) } : c)) }
    )
  }

  async function enviar(formData: FormData) {
    setEnviando(true)
    setErro(null)
    // Anexa os campos extras (estado client) como JSON.
    formData.set('campos_extras', JSON.stringify(campos))
    formData.set('dias', JSON.stringify(dias))
    const res =
      modo === 'editar' && evento
        ? await atualizarEvento(evento.id, formData)
        : await criarEvento(formData)
    // Em sucesso a action redireciona; só chegamos aqui em erro.
    setEnviando(false)
    if (res && !res.ok) setErro(res.erro ?? 'Não foi possível salvar o evento.')
  }

  return (
    <form action={enviar} className="grid gap-[18px] [grid-template-columns:1fr_320px] items-start max-[860px]:grid-cols-1">
      <div className="grid gap-[18px]">
        <div className="card p-[22px]">
          <h2 className="text-lg font-semibold mb-3.5">Informações do evento</h2>
          <div className="mb-[18px]">
            <Input
              label="Nome do evento"
              name="nome"
              required
              placeholder="Ex: Workshop de Cerâmica"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div className="mb-[18px]">
            <ImageUpload name="capa" defaultPreview={evento?.imagem_url ?? null} defaultCor={evento?.cor_capa ?? null} />
          </div>
          <div className="mb-[18px]">
            <label className="block text-[13px] font-semibold mb-1.5">Descrição</label>
            <textarea
              name="descricao"
              className="input"
              rows={3}
              placeholder="Conte o que o participante vai viver."
              defaultValue={evento?.descricao ?? ''}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 max-[860px]:grid-cols-1">
            <Input
              label="Data e hora"
              name="data_hora"
              type="datetime-local"
              required
              defaultValue={evento ? paraDatetimeLocal(evento.data_hora) : undefined}
            />
            <Input
              label="Local"
              name="local"
              placeholder="Endereço ou 'Online'"
              defaultValue={evento?.local ?? ''}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-[18px] max-[860px]:grid-cols-1">
            <Input
              label="Vagas máximas"
              name="vagas_max"
              type="number"
              min={1}
              defaultValue={evento?.vagas_max ?? undefined}
            />
            <div>
              <label className="block text-[13px] font-semibold mb-1.5">Valor</label>
              <div className="inline-flex border border-line rounded-pill overflow-hidden">
                <button
                  type="button"
                  onClick={() => setValorPago(false)}
                  className={`px-[18px] py-2.5 text-sm font-semibold ${!valorPago ? 'bg-primary text-white' : 'bg-white text-muted'}`}
                >
                  Grátis
                </button>
                <button
                  type="button"
                  onClick={() => setValorPago(true)}
                  className={`px-[18px] py-2.5 text-sm font-semibold ${valorPago ? 'bg-primary text-white' : 'bg-white text-muted'}`}
                >
                  Pago
                </button>
              </div>
              {valorPago ? (
                <input
                  name="valor"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="R$ 0,00"
                  className="input mt-2.5"
                  defaultValue={evento && evento.valor > 0 ? (evento.valor / 100).toFixed(2) : undefined}
                />
              ) : (
                <input type="hidden" name="valor" value="0" />
              )}
            </div>
          </div>
        </div>

        <div className="card p-[22px]">
          <h2 className="text-lg font-semibold">Período de inscrição</h2>
          <p className="text-xs text-muted mt-1 mb-4">
            Fora deste período ninguém se inscreve nem escolhe palestras. Deixe em branco para não
            limitar.
          </p>
          <div className="grid grid-cols-2 gap-4 max-[860px]:grid-cols-1">
            <Input
              label="Inscrições abrem em"
              name="inscricoes_abrem_em"
              type="datetime-local"
              defaultValue={
                evento?.inscricoes_abrem_em ? paraDatetimeLocal(evento.inscricoes_abrem_em) : ''
              }
            />
            <Input
              label="Inscrições fecham em"
              name="inscricoes_fecham_em"
              type="datetime-local"
              defaultValue={
                evento?.inscricoes_fecham_em ? paraDatetimeLocal(evento.inscricoes_fecham_em) : ''
              }
            />
          </div>
        </div>

        <div className="card p-[22px]">
          <h2 className="text-lg font-semibold">Campos do formulário de inscrição</h2>
          <p className="text-xs text-muted mt-1 mb-4">
            Reordene com as setas. Nome e e-mail são sempre coletados; adicione
            outros campos se precisar.
          </p>

          <div className="grid gap-3">
            {campos.map((c, i) => (
              <div key={c.id} className="border border-line rounded-xl bg-sand/60 p-3.5">
                <div className="flex gap-2.5 items-start">
                  {/* Setas de ordenação: sobem/descem o campo na lista. */}
                  <div className="flex flex-col shrink-0 -my-0.5">
                    <button
                      type="button"
                      onClick={() => setCampos((cs) => mover(cs, i, -1))}
                      disabled={i === 0}
                      className="text-muted hover:text-primary disabled:opacity-30 disabled:hover:text-muted px-1 leading-none"
                      aria-label="Mover para cima"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => setCampos((cs) => mover(cs, i, 1))}
                      disabled={i === campos.length - 1}
                      className="text-muted hover:text-primary disabled:opacity-30 disabled:hover:text-muted px-1 leading-none"
                      aria-label="Mover para baixo"
                    >
                      ▼
                    </button>
                  </div>

                  {c.fixo ? (
                    <div className="input flex-1 flex items-center justify-between bg-line/20 text-ink cursor-default">
                      <span>{c.label}</span>
                      <span className="text-[11px] uppercase tracking-wide text-muted">
                        Sempre coletado
                      </span>
                    </div>
                  ) : (
                    <input
                      className="input flex-1"
                      placeholder="Ex: Instituição"
                      value={c.label}
                      onChange={(e) => atualizarCampo(c.id, { label: e.target.value })}
                    />
                  )}

                  {!c.fixo && (
                    <select
                      className="input w-[130px] shrink-0"
                      value={c.tipo}
                      onChange={(e) => {
                        const tipo = e.target.value as CampoExtraTipo
                        // Ao virar "opcoes", já cria uma opção em branco pra editar.
                        atualizarCampo(c.id, {
                          tipo,
                          opcoes:
                            tipo === 'opcoes' ? (c.opcoes?.length ? c.opcoes : ['']) : c.opcoes,
                        })
                      }}
                    >
                      <option value="texto">Texto</option>
                      <option value="numero">Número</option>
                      <option value="cpf">CPF</option>
                      <option value="telefone">Telefone</option>
                      <option value="opcoes">Opções</option>
                    </select>
                  )}

                  {!c.fixo && (
                    <button
                      type="button"
                      onClick={() => setCampos((cs) => cs.filter((x) => x.id !== c.id))}
                      className="text-muted hover:text-error px-1.5 text-lg shrink-0"
                      aria-label="Remover campo"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Lista de opções, só quando o tipo é "opcoes". O form público
                    monta o <select> a partir daqui — sem isso ele vinha vazio. */}
                {c.tipo === 'opcoes' && (
                  <div className="mt-3 ml-9 grid gap-2">
                    {(c.opcoes ?? []).map((o, j) => (
                      <div key={j} className="flex gap-2 items-center">
                        <span className="text-muted text-sm shrink-0">•</span>
                        <input
                          className="input flex-1 py-2 text-sm"
                          placeholder={`Opção ${j + 1}`}
                          value={o}
                          onChange={(e) => atualizarOpcao(c.id, j, e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => removerOpcao(c.id, j)}
                          className="text-muted hover:text-error px-1.5 shrink-0"
                          aria-label="Remover opção"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => adicionarOpcao(c.id)}
                      className="text-primary text-sm font-semibold text-left ml-5 hover:underline"
                    >
                      ＋ Adicionar opção
                    </button>
                  </div>
                )}

                {/* Nome e e-mail são sempre obrigatórios: sem toggle para eles. */}
                {!c.fixo && (
                  <label className="flex items-center gap-2 mt-3 ml-9 text-sm text-ink cursor-pointer select-none w-fit">
                    <input
                      type="checkbox"
                      checked={c.obrigatorio}
                      onChange={(e) => atualizarCampo(c.id, { obrigatorio: e.target.checked })}
                      className="w-4 h-4 rounded border-line text-primary focus:ring-primary/30"
                    />
                    Obrigatório
                  </label>
                )}
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setCampos((cs) => [...cs, novoCampo()])}
            className="mt-3"
          >
            ＋ Adicionar campo
          </Button>
        </div>

        <div className="card p-[22px]">
          <h2 className="text-lg font-semibold">Programação</h2>
          <p className="text-xs text-muted mt-1 mb-4">
            Organize por dia. Dentro do dia, adicione sessões soltas ou agrupe em categorias
            (ex: um tema com várias sessões).
          </p>
          {dias.map((dia, i) => (
            <div key={dia.id} className="border border-line rounded-md p-3 mb-4 grid gap-3">
              <div className="flex gap-2.5 items-center">
                <span className="text-sm font-semibold text-secondary shrink-0">Dia {i + 1}</span>
                <input
                  type="date"
                  className="input flex-1"
                  value={dia.data}
                  onChange={(e) => atualizarDia(dia.id, { data: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => removerDia(dia.id)}
                  className="text-muted hover:text-error px-1.5 text-lg"
                  aria-label="Remover dia"
                >
                  ✕
                </button>
              </div>

              {/* Sessões soltas do dia (sem categoria) */}
              {dia.sessoes.map((s) => (
                <SessaoEditor
                  key={s.id}
                  s={s}
                  onChange={(patch) => atualizarSessao(dia.id, null, s.id, patch)}
                  onRemove={() => removerSessao(dia.id, null, s.id)}
                />
              ))}

              {/* Categorias do dia, cada uma com suas sessões */}
              {dia.categorias.map((c) => (
                <div key={c.id} className="border border-primary-light rounded-md p-3 grid gap-2.5 bg-status-inscrito-bg">
                  <div className="flex gap-2.5 items-center">
                    <input
                      className="input flex-1 font-semibold"
                      placeholder="Título da categoria (ex: Gestão Municipal e Políticas Públicas)"
                      value={c.titulo}
                      onChange={(e) => atualizarCategoria(dia.id, c.id, { titulo: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => removerCategoria(dia.id, c.id)}
                      className="text-muted hover:text-error px-1.5 text-lg"
                      aria-label="Remover categoria"
                    >
                      ✕
                    </button>
                  </div>
                  {c.sessoes.map((s) => (
                    <SessaoEditor
                      key={s.id}
                      s={s}
                      onChange={(patch) => atualizarSessao(dia.id, c.id, s.id, patch)}
                      onRemove={() => removerSessao(dia.id, c.id, s.id)}
                    />
                  ))}
                  <Button type="button" variant="ghost" onClick={() => addSessao(dia.id, c.id)}>
                    ＋ Adicionar sessão à categoria
                  </Button>
                </div>
              ))}

              <div className="flex gap-2.5 flex-wrap">
                <Button type="button" variant="ghost" onClick={() => addSessao(dia.id, null)}>
                  ＋ Sessão avulsa
                </Button>
                <Button type="button" variant="ghost" onClick={() => addCategoria(dia.id)}>
                  ＋ Categoria
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="ghost" onClick={() => setDias((ds) => [...ds, novoDia()])}>
            ＋ Adicionar dia
          </Button>
        </div>

        {erro && <p className="text-error text-sm">{erro}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={enviando}>
            {enviando ? 'Salvando…' : modo === 'editar' ? 'Salvar alterações' : 'Publicar evento'}
          </Button>
          {modo === 'criar' && (
            <Button type="button" variant="ghost">
              Salvar rascunho
            </Button>
          )}
        </div>
      </div>

      <aside className="grid gap-[18px]">
        <div className="card p-[22px]">
          <label className="block text-[13px] font-semibold mb-1.5">
            {modo === 'editar' ? 'URL pública' : 'URL pública gerada'}
          </label>
          <div className="font-body bg-status-inscrito-bg border border-dashed border-primary-light rounded-md px-3.5 py-3 text-sm text-primary break-all">
            creden.com.br/e/{slug}
          </div>
          <p className="text-xs text-muted mt-1.5">
            {modo === 'editar'
              ? 'O link não muda ao editar.'
              : 'Gerada a partir do nome. Você poderá editar o final.'}
          </p>
        </div>
      </aside>
    </form>
  )
}

// Editor de uma sessão (reusado para sessão solta no dia e sessão dentro de categoria).
function SessaoEditor({
  s,
  onChange,
  onRemove,
}: {
  s: Sessao
  onChange: (patch: Partial<Sessao>) => void
  onRemove: () => void
}) {
  return (
    <div className="border border-line rounded-md p-3 grid gap-2.5 bg-sand">
      <div className="flex gap-2.5 items-center">
        <input
          className="input flex-1"
          placeholder="Título da sessão"
          value={s.titulo}
          onChange={(e) => onChange({ titulo: e.target.value })}
        />
        <button
          type="button"
          onClick={onRemove}
          className="text-muted hover:text-error px-1.5 text-lg"
          aria-label="Remover sessão"
        >
          ✕
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2.5 max-[860px]:grid-cols-1">
        <input
          type="time"
          className="input"
          value={s.hora_inicio}
          onChange={(e) => onChange({ hora_inicio: e.target.value })}
        />
        <input
          type="time"
          className="input"
          value={s.hora_fim}
          onChange={(e) => onChange({ hora_fim: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2.5 max-[860px]:grid-cols-1">
        <select
          className="input"
          value={s.tipo}
          onChange={(e) => onChange({ tipo: e.target.value as TipoSessao })}
        >
          <option value="palestra">Palestra</option>
          <option value="minicurso">Minicurso</option>
          <option value="servico">Serviço</option>
          <option value="outro">Outro</option>
        </select>
        {s.tipo === 'outro' ? (
          <input
            className="input"
            placeholder="Nome do tipo (ex: Mesa redonda)"
            value={s.tipo_outro ?? ''}
            onChange={(e) => onChange({ tipo_outro: e.target.value || null })}
          />
        ) : (
          <div />
        )}
      </div>
      <div className="grid grid-cols-2 gap-2.5 max-[860px]:grid-cols-1">
        <input
          className="input"
          placeholder="Palestrante (opcional)"
          value={s.palestrante ?? ''}
          onChange={(e) => onChange({ palestrante: e.target.value || null })}
        />
        <input
          className="input"
          placeholder="Local/sala (opcional)"
          value={s.local ?? ''}
          onChange={(e) => onChange({ local: e.target.value || null })}
        />
      </div>
      <input
        type="number"
        min={1}
        className="input"
        placeholder="Vagas (deixe vazio p/ ilimitado)"
        value={s.vagas_max ?? ''}
        onChange={(e) => onChange({ vagas_max: e.target.value ? Number(e.target.value) : null })}
        disabled={s.sem_inscricao}
      />
      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={s.sem_inscricao}
          onChange={(e) => onChange({ sem_inscricao: e.target.checked })}
        />
        Não exige inscrição (intervalo, pausa, abertura…)
      </label>
    </div>
  )
}
