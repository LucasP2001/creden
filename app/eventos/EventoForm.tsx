'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ImageUpload } from '@/components/ImageUpload'
import { CampoExtra, CampoExtraTipo, Evento, Sessao, TipoSessao } from '@/types'
import { novaSessao } from '@/lib/sessoes'
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
  const [campos, setCampos] = useState<CampoExtra[]>(evento?.campos_extras ?? [])
  const [sessoes, setSessoes] = useState<Sessao[]>(evento?.sessoes ?? [])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const slug = useMemo(() => (evento ? evento.slug : slugify(nome) || 'meu-evento'), [nome, evento])

  function atualizarCampo(id: string, patch: Partial<CampoExtra>) {
    setCampos((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function atualizarSessao(id: string, patch: Partial<Sessao>) {
    setSessoes((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }

  async function enviar(formData: FormData) {
    setEnviando(true)
    setErro(null)
    // Anexa os campos extras (estado client) como JSON.
    formData.set('campos_extras', JSON.stringify(campos))
    formData.set('sessoes', JSON.stringify(sessoes))
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
          <h2 className="text-lg font-semibold">Campos do formulário de inscrição</h2>
          <p className="text-xs text-muted mt-1 mb-4">
            Nome e e-mail já são coletados. Adicione campos extras se precisar.
          </p>
          {campos.map((c) => (
            <div key={c.id} className="flex gap-2.5 items-center mb-2.5">
              <input
                className="input flex-1"
                placeholder="Ex: Instituição"
                value={c.label}
                onChange={(e) => atualizarCampo(c.id, { label: e.target.value })}
              />
              <select
                className="input w-[140px]"
                value={c.tipo}
                onChange={(e) => atualizarCampo(c.id, { tipo: e.target.value as CampoExtraTipo })}
              >
                <option value="texto">Texto</option>
                <option value="numero">Número</option>
                <option value="opcoes">Opções</option>
              </select>
              <button
                type="button"
                onClick={() => setCampos((cs) => cs.filter((x) => x.id !== c.id))}
                className="text-muted hover:text-error px-1.5 text-lg"
                aria-label="Remover campo"
              >
                ✕
              </button>
            </div>
          ))}
          <Button type="button" variant="ghost" onClick={() => setCampos((cs) => [...cs, novoCampo()])}>
            ＋ Adicionar campo
          </Button>
        </div>

        <div className="card p-[22px]">
          <h2 className="text-lg font-semibold">Programação</h2>
          <p className="text-xs text-muted mt-1 mb-4">
            Palestras, minicursos e atividades. O participante pode marcar interesse em cada uma.
          </p>
          {sessoes.map((s) => (
            <div key={s.id} className="border border-line rounded-md p-3 mb-3 grid gap-2.5">
              <div className="flex gap-2.5 items-center">
                <input
                  className="input flex-1"
                  placeholder="Título (ex: Logística e Cadeia de Suprimentos)"
                  value={s.titulo}
                  onChange={(e) => atualizarSessao(s.id, { titulo: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setSessoes((ss) => ss.filter((x) => x.id !== s.id))}
                  className="text-muted hover:text-error px-1.5 text-lg"
                  aria-label="Remover sessão"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2.5 max-[860px]:grid-cols-1">
                <input
                  type="date"
                  className="input"
                  value={s.dia}
                  onChange={(e) => atualizarSessao(s.id, { dia: e.target.value })}
                />
                <input
                  type="time"
                  className="input"
                  value={s.hora_inicio}
                  onChange={(e) => atualizarSessao(s.id, { hora_inicio: e.target.value })}
                />
                <input
                  type="time"
                  className="input"
                  value={s.hora_fim}
                  onChange={(e) => atualizarSessao(s.id, { hora_fim: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5 max-[860px]:grid-cols-1">
                <select
                  className="input"
                  value={s.tipo}
                  onChange={(e) => atualizarSessao(s.id, { tipo: e.target.value as TipoSessao })}
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
                    onChange={(e) => atualizarSessao(s.id, { tipo_outro: e.target.value || null })}
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
                  onChange={(e) => atualizarSessao(s.id, { palestrante: e.target.value || null })}
                />
                <input
                  className="input"
                  placeholder="Local/sala (opcional)"
                  value={s.local ?? ''}
                  onChange={(e) => atualizarSessao(s.id, { local: e.target.value || null })}
                />
              </div>
              <input
                type="number"
                min={1}
                className="input"
                placeholder="Vagas (deixe vazio p/ ilimitado)"
                value={s.vagas_max ?? ''}
                onChange={(e) =>
                  atualizarSessao(s.id, { vagas_max: e.target.value ? Number(e.target.value) : null })
                }
              />
            </div>
          ))}
          <Button type="button" variant="ghost" onClick={() => setSessoes((ss) => [...ss, novaSessao()])}>
            ＋ Adicionar sessão
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
