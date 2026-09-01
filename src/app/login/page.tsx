"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/lib/supabase/client";
import { login } from "./actions";

function ErroNotice() {
  const searchParams = useSearchParams();
  const erro = searchParams.get("erro");
  if (erro === "link_invalido") {
    return (
      <p className="text-sm text-red-600">
        Esse link de redefinição de senha é inválido ou expirou. Peça um novo em &quot;Esqueci minha senha&quot;.
      </p>
    );
  }
  if (erro === "google_invalido") {
    return <p className="text-sm text-red-600">Não foi possível entrar com o Google. Tente de novo.</p>;
  }
  return null;
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, undefined);
  const [googlePending, setGooglePending] = useState(false);

  async function handleGoogleLogin() {
    setGooglePending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    });
    if (error) {
      setGooglePending(false);
    }
    // Sem erro: o navegador ja esta sendo redirecionado pro Google.
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <form
        action={formAction}
        className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-8 shadow-sm"
      >
        <div className="space-y-3">
          <Image src="/wecare-logo.png" alt="WeCare" width={140} height={60} className="h-10 w-auto" priority />
          <div>
            <h1 className="text-xl font-semibold text-foreground">WeCare Portal</h1>
            <p className="text-sm text-muted">Entre com sua conta para continuar.</p>
          </div>
        </div>

        <Suspense fallback={null}>
          <ErroNotice />
        </Suspense>

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>

        <Link href="/esqueci-senha" className="block text-center text-sm text-muted hover:text-foreground">
          Esqueci minha senha
        </Link>

        <div className="flex items-center gap-3 text-xs uppercase text-muted">
          <span className="h-px flex-1 bg-border" />
          ou
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googlePending}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-border py-2 text-sm font-medium text-foreground hover:bg-surface-2 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.63h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.81Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.87-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A11.998 11.998 0 0 0 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.27a12 12 0 0 0 0 10.75l4-3.11Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.23 0 12 0 7.31 0 3.26 2.69 1.27 6.63l4 3.1C6.22 6.86 8.87 4.75 12 4.75Z"
            />
          </svg>
          {googlePending ? "Redirecionando..." : "Continuar com Google"}
        </button>
      </form>
    </main>
  );
}
