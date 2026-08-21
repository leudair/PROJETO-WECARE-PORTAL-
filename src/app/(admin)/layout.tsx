import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/data/auth";
import { logout } from "@/app/logout-action";
import { ThemeToggle } from "@/components/theme-toggle";

const ROLE_LABEL: Record<string, string> = {
  admin: "CEO",
  manager: "Gerente",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin" className="flex items-center gap-2 font-semibold text-foreground">
              <Image src="/wecare-logo.png" alt="WeCare" width={140} height={60} className="h-6 w-auto" priority />
              Portal
            </Link>
            <Link href="/admin" className="text-muted hover:text-foreground">
              Visão geral
            </Link>
            <Link href="/admin/employees" className="text-muted hover:text-foreground">
              Funcionários
            </Link>
            <Link href="/admin/templates" className="text-muted hover:text-foreground">
              Mensagens
            </Link>
            <Link href="/financeiro" className="text-muted hover:text-foreground">
              Financeiro
            </Link>
          </nav>
          <div className="flex items-center gap-3 text-sm text-muted">
            <span>
              {profile.full_name}
              <span className="ml-1 text-xs text-muted">({ROLE_LABEL[profile.role] ?? profile.role})</span>
            </span>
            <form action={logout}>
              <button type="submit" className="text-muted hover:text-foreground">
                Sair
              </button>
            </form>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
