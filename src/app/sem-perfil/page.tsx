import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { logout } from "@/app/logout-action";

// Cai aqui quando ha uma sessao Supabase valida (ex: apos confirmar um link
// de redefinicao de senha ou magic link) mas sem linha correspondente em
// profiles — conta ainda nao cadastrada pelo admin. Ver requireProfile() em
// src/lib/data/auth.ts.
export default function SemPerfilPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-8 shadow-sm">
        <div className="space-y-3">
          <Image src="/wecare-logo.png" alt="WeCare" width={140} height={60} className="h-10 w-auto" priority />
          <div>
            <h1 className="text-xl font-semibold text-foreground">Conta sem acesso configurado</h1>
            <p className="text-sm text-muted">
              Seu email foi autenticado, mas ainda não tem um perfil configurado no portal. Fale com um
              administrador para liberar seu acesso.
            </p>
          </div>
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground"
          >
            Sair
          </button>
        </form>
      </div>
    </main>
  );
}
