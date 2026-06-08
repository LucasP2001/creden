import Link from 'next/link'
import { ComponentProps } from 'react'

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost'

const variantClass: Record<Variant, string> = {
  primary: 'btn-primary',
  accent: 'btn-accent',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
}

interface BaseProps {
  variant?: Variant
  block?: boolean
  className?: string
  children: React.ReactNode
}

// Componente base reusado pelas telas — não recriar botão ad-hoc (skill creden-conventions).
export function Button({
  variant = 'primary',
  block,
  className = '',
  ...rest
}: BaseProps & ComponentProps<'button'>) {
  return (
    <button
      className={`btn ${variantClass[variant]} ${block ? 'w-full justify-center' : ''} ${className}`}
      {...rest}
    />
  )
}

export function ButtonLink({
  variant = 'primary',
  block,
  className = '',
  href,
  children,
}: BaseProps & { href: string }) {
  return (
    <Link
      href={href}
      className={`btn ${variantClass[variant]} ${block ? 'w-full justify-center' : ''} ${className}`}
    >
      {children}
    </Link>
  )
}
