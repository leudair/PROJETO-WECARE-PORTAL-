import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { confirmPasswordReset } from "./actions";

// Server Component de proposito: o GET so renderiza a pagina, sem verificar
// o token — assim scanners de spam/antivirus que pre-clicam o link do email
// batem aqui numa GET inofensiva em vez de gastar o token de uso unico antes
// do clique real do usuario (ver actions.ts).
export default async function ConfirmarRedefinicaoPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; erro?: string }>;
}) {
  const { token_hash: tokenHash, type, erro } = await searchParams;
  const linkValido = Boolean(tokenHash && type) && !erro;

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-8 shadow-sm">
        <div className="space-y-3">
          <Image src="/wecare-logo.png" alt="WeCare" width={140} height={60} className="h-10 w-auto" priority />
          <div>
            <h1 className="text-xl font-semibold text-foreground">Redefinir senha</h1>
            <p className="text-sm text-muted">Clique no botão abaixo para confirmar a redefinição de senha.</p>
          </div>
        </div>

        {erro && <p className="text-sm text-red-600">Link expirado ou já usado, peça um novo.</p>}
        {!erro && !linkValido && <p className="text-sm text-red-600">Link inválido, peça um novo.</p>}

        {linkValido && (
          <form action={confirmPasswordReset}>
            <input type="hidden" name="token_hash" value={tokenHash} />
            <input type="hidden" name="type" value={type} />
            <button
              type="submit"
              className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground"
            >
              Confirmar redefinição de senha
            </button>
          </form>
        )}

        <Link href="/esqueci-senha" className="block text-center text-sm text-muted hover:text-foreground">
          Pedir novo link
        </Link>
      </div>
    </main>
  );
}
