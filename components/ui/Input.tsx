import { ComponentProps } from 'react'

interface InputProps extends ComponentProps<'input'> {
  label?: string
  hint?: string
}

// Input base reusado pelas telas (skill creden-conventions).
export function Input({ label, hint, id, className = '', ...rest }: InputProps) {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-[13px] font-semibold text-ink mb-1.5">
          {label}
        </label>
      )}
      <input id={id} className={`input ${className}`} {...rest} />
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}
