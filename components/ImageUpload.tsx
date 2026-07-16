'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { validarImagem, IMAGEM_TIPOS_ACEITOS } from '@/lib/imagem'

interface Props {
  name: string
  label?: string
  defaultPreview?: string | null
}

// Dropzone de imagem: input file + preview + validação client.
// O File selecionado viaja pela server action via FormData (name={name}).
export function ImageUpload({ name, label = 'Foto de capa', defaultPreview = null }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(defaultPreview)
  const [erro, setErro] = useState<string | null>(null)

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
        className="w-full rounded-md border border-dashed border-line bg-surface overflow-hidden text-left hover:border-primary-light transition"
      >
        {preview ? (
          <div className="relative h-40 w-full">
            <Image src={preview} alt="Prévia da capa" fill className="object-cover" unoptimized />
          </div>
        ) : (
          <div className="h-40 grid place-items-center text-muted text-sm gap-1">
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
      {preview && (
        <button
          type="button"
          onClick={() => {
            if (inputRef.current) inputRef.current.value = ''
            setPreview(defaultPreview)
            setErro(null)
          }}
          className="text-xs text-muted hover:text-error mt-1.5"
        >
          Remover foto
        </button>
      )}
      {erro && <p className="text-error text-xs mt-1.5">{erro}</p>}
    </div>
  )
}
