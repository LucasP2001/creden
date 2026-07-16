'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import {
  validarImagem,
  IMAGEM_TIPOS_ACEITOS,
  CORES_CAPA,
  COR_CAPA_PADRAO,
  corCapaValida,
} from '@/lib/imagem'

interface Props {
  name: string
  label?: string
  defaultPreview?: string | null
  defaultCor?: string | null
}

// Dropzone de imagem: input file + preview + validação client + cor de fundo.
// O File viaja pela server action via FormData (name={name}); a cor vai em cor_capa.
export function ImageUpload({
  name,
  label = 'Foto de capa',
  defaultPreview = null,
  defaultCor = null,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(defaultPreview)
  const [erro, setErro] = useState<string | null>(null)
  const [cor, setCor] = useState<string>(corCapaValida(defaultCor))

  function aoSelecionar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setErro(null)
    if (!file) {
      setPreview(defaultPreview)
      return
    }
    const msg = validarImagem(file)
    if (msg) {
      setErro(msg)
      e.target.value = ''
      setPreview(defaultPreview)
      return
    }
    setPreview(URL.createObjectURL(file))
  }

  return (
    <div>
      <label className="block text-[13px] font-semibold mb-1.5">{label}</label>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-md border border-dashed border-line overflow-hidden text-left hover:border-primary-light transition"
        style={{ backgroundColor: preview ? cor : undefined }}
      >
        {preview ? (
          <div className="relative h-40 w-full">
            <Image src={preview} alt="Prévia da capa" fill className="object-contain" unoptimized />
          </div>
        ) : (
          <div className="h-40 grid place-items-center text-muted text-sm gap-1 bg-surface">
            <span className="text-2xl">🖼️</span>
            <span>Clique para escolher uma foto</span>
            <span className="text-xs">JPG, PNG ou WEBP · até 5 MB</span>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={IMAGEM_TIPOS_ACEITOS.join(',')}
        onChange={aoSelecionar}
        className="hidden"
      />
      {/* Cor de fundo da capa (atrás da imagem). Vai pro form via hidden input. */}
      <input type="hidden" name="cor_capa" value={cor} />
      {preview && (
        <div className="mt-2">
          <span className="block text-xs text-muted mb-1.5">Cor de fundo</span>
          <div className="flex flex-wrap gap-2">
            {CORES_CAPA.map((c) => (
              <button
                key={c.valor}
                type="button"
                onClick={() => setCor(c.valor)}
                title={c.nome}
                aria-label={c.nome}
                aria-pressed={cor === c.valor}
                className={`w-7 h-7 rounded-full border overflow-hidden transition ${
                  cor === c.valor ? 'ring-2 ring-primary ring-offset-1' : 'border-line'
                }`}
                style={
                  c.valor === 'transparent'
                    ? {
                        // xadrez cinza indicando "sem fundo"
                        backgroundImage:
                          'linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%)',
                        backgroundSize: '8px 8px',
                        backgroundPosition: '0 0,0 4px,4px -4px,-4px 0',
                        backgroundColor: '#fff',
                      }
                    : { backgroundColor: c.valor }
                }
              />
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 mt-1.5">
        {preview && (
          <button
            type="button"
            onClick={() => {
              if (inputRef.current) inputRef.current.value = ''
              setPreview(defaultPreview)
              setCor(corCapaValida(defaultCor))
              setErro(null)
            }}
            className="text-xs text-muted hover:text-error"
          >
            Remover foto
          </button>
        )}
      </div>
      {erro && <p className="text-error text-xs mt-1.5">{erro}</p>}
    </div>
  )
}
