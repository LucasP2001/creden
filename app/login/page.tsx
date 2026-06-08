import { LoginGoogle } from './LoginGoogle'
import { Logo } from '@/components/Logo'

// Página de login do organizador. O participante não precisa de conta.
export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; erro?: string }
}) {
  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="w-full max-w-sm text-center">
        <Logo className="text-xl justify-center" />
        <h1 className="font-display text-3xl font-semibold mt-6">Entrar</h1>
        <p className="text-muted mt-2 mb-8">
          Acesse o painel para criar eventos e gerenciar inscritos.
        </p>

        <div className="card p-7">
          <LoginGoogle next={searchParams.next} />
          {searchParams.erro && (
            <p className="text-error text-sm mt-4">
              Não foi possível entrar. Tente novamente.
            </p>
          )}
        </div>

        <p className="text-xs text-muted mt-6">
          É participante? Você não precisa de conta — use o link do evento que recebeu.
        </p>
      </div>
    </main>
  )
}
