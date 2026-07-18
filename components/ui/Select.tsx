'use client'

import { useEffect, useId, useRef, useState } from 'react'

interface Props {
  name: string
  opcoes: string[]
  required?: boolean
  placeholder?: string
  /** Controlado: valor atual e callback de mudança. */
  value?: string
  onChange?: (valor: string) => void
  /** Chamado quando o dropdown fecha (equivale ao blur de um input). */
  onBlur?: () => void
  /** Pinta a borda de erro (obrigatório vazio). */
  invalido?: boolean
}

// Dropdown custom acessível — o <select> nativo abre um menu do SO que não pode
// ser estilizado (fica azul do Android, quebra a identidade). Aqui o gatilho usa
// a classe .input (bate com os outros campos) e a lista é nossa: cores da paleta,
// teclado e fora-clique. O valor real vai num <input hidden> para o form nativo ler.
//
// Pode ser controlado (value + onChange) ou autônomo (mantém o valor internamente).
export function Select({
  name,
  opcoes,
  required,
  placeholder = 'Selecione…',
  value,
  onChange,
  onBlur,
  invalido,
}: Props) {
  const [aberto, setAberto] = useState(false)
  const [valorInterno, setValorInterno] = useState('')
  const controlado = value !== undefined
  const valor = controlado ? value : valorInterno
  const [ativo, setAtivo] = useState(0) // índice destacado pelo teclado
  const raiz = useRef<HTMLDivElement>(null)
  const listaId = useId()

  // Fecha ao clicar fora (e dispara onBlur, como um input perdendo o foco).
  useEffect(() => {
    if (!aberto) return
    function fora(e: MouseEvent) {
      if (raiz.current && !raiz.current.contains(e.target as Node)) {
        setAberto(false)
        onBlur?.()
      }
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto, onBlur])

  function escolher(o: string) {
    if (controlado) onChange?.(o)
    else setValorInterno(o)
    setAberto(false)
    onBlur?.()
  }

  function aoTeclar(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (aberto) escolher(opcoes[ativo])
      else setAberto(true)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!aberto) setAberto(true)
      else setAtivo((i) => Math.min(i + 1, opcoes.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAtivo((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Escape') {
      setAberto(false)
      onBlur?.()
    }
  }

  return (
    <div ref={raiz} className="relative">
      {/* Valor real para o form nativo (a action lê por name). */}
      <input type="hidden" name={name} value={valor} required={required} />

      <button
        type="button"
        role="combobox"
        aria-expanded={aberto}
        aria-controls={listaId}
        aria-haspopup="listbox"
        onClick={() => setAberto((v) => !v)}
        onKeyDown={aoTeclar}
        aria-invalid={invalido}
        className={`input flex items-center justify-between gap-2 text-left ${
          invalido ? 'border-error focus:border-error focus:ring-error/20' : ''
        }`}
      >
        <span className={valor ? 'text-ink' : 'text-muted'}>{valor || placeholder}</span>
        <svg
          className={`w-4 h-4 shrink-0 text-muted transition-transform ${aberto ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
        >
          <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {aberto && (
        <ul
          id={listaId}
          role="listbox"
          className="absolute z-30 mt-1.5 w-full rounded-md border border-line bg-surface py-1 shadow-lift animate-fade-up max-h-60 overflow-auto"
        >
          {opcoes.map((o, i) => {
            const selecionado = o === valor
            return (
              <li
                key={o}
                role="option"
                aria-selected={selecionado}
                onMouseEnter={() => setAtivo(i)}
                onClick={() => escolher(o)}
                className={`flex items-center justify-between gap-2 px-3.5 py-2.5 text-[15px] cursor-pointer ${
                  i === ativo ? 'bg-primary/10' : ''
                } ${selecionado ? 'text-primary font-semibold' : 'text-ink'}`}
              >
                {o}
                {selecionado && (
                  <svg className="w-4 h-4 text-primary shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden>
                    <path
                      d="M5 10.5l3.5 3.5L15 6.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
