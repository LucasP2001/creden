'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ImageUpload } from '@/components/ImageUpload'
import { CampoExtra, CampoExtraTipo } from '@/types'
import { slugify } from '@/lib/slug'
import { criarEvento } from './actions'

let _id = 0
const novoCampo = (): CampoExtra => ({
  id: `c${_id++}`,
  label: '',
  tipo: 'texto',
  obrigatorio: false,
})

export function NovoEventoForm() {
  const [nome, setNome] = useState('')
  const [valorPago, setValorPago] = useState(false)
  const [campos, setCampos] = useState<CampoExtra[]>([])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const slug = useMemo(() => slugify(nome) || 'meu-evento', [nome])

  function atualizarCampo(id: string, patch: Partial<CampoExtra>) {
    setCampos((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  async function publicar(formData: FormData) {
    setEnviando(true)
    setErro(null)
    // Anexa os campos extras (estado client) como JSON.
    formData.set('campos_extras', JSON.stringify(campos))
    const res = await criarEvento(formData)
    // Em sucesso a action redireciona; só chegamos aqui em erro.
    setEnviando(false)
    if (res && !res.ok) setErro(res.erro ?? 'Não foi possível publicar o evento.')
  }

  return (
    <form action={publicar} className="grid gap-[18px] [grid-template-columns:1fr_320px] items-start max-[860px]:grid-cols-1">
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
            <ImageUpload name="capa" />
          </div>
          <div className="mb-[18px]">
            <label className="block text-[13px] font-semibold mb-1.5">Descrição</label>
            <textarea name="descricao" className="input" rows={3} placeholder="Conte o que o participante vai viver." />
          </div>
          <div className="grid grid-cols-2 gap-4 max-[860px]:grid-cols-1">
            <Input label="Data e hora" name="data_hora" type="datetime-local" required />
            <Input label="Local" name="local" placeholder="Endereço ou 'Online'" />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-[18px] max-[860px]:grid-cols-1">
            <Input label="Vagas máximas" name="vagas_max" type="number" min={1} />
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

        {erro && <p className="text-error text-sm">{erro}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={enviando}>
            {enviando ? 'Publicando…' : 'Publicar evento'}
          </Button>
          <Button type="button" variant="ghost">
            Salvar rascunho
          </Button>
        </div>
      </div>

      <aside className="grid gap-[18px]">
        <div className="card p-[22px]">
          <label className="block text-[13px] font-semibold mb-1.5">URL pública gerada</label>
          <div className="font-body bg-status-inscrito-bg border border-dashed border-primary-light rounded-md px-3.5 py-3 text-sm text-primary break-all">
            creden.com.br/e/{slug}
          </div>
          <p className="text-xs text-muted mt-1.5">Gerada a partir do nome. Você poderá editar o final.</p>
        </div>
      </aside>
    </form>
  )
}
