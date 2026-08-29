import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/data/auth";
import { logout } from "@/app/logout-action";
import { ThemeToggle } from "@/components/theme-toggle";
import { initials } from "@/lib/initials";

const ROLE_LABEL: Record<string, string> = {
  admin: "CEO",
  manager: "Gerente",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface shadow-[0_1px_0_0_var(--border-color),0_8px_24px_-16px_rgba(0,0,0,0.35)]">
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
            <a
              href="https://wecare-radar.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-foreground"
            >
              Radar
            </a>
          </nav>
          <div className="flex items-center gap-3 text-sm text-muted">
            <div className="flex items-center gap-2 rounded-full border border-border bg-gradient-to-b from-surface-2 to-surface py-1 pr-3 pl-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_1px_3px_rgba(0,0,0,0.15)]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-b from-primary to-[color-mix(in_srgb,var(--primary)_85%,black)] text-[10px] font-bold text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                {initials(profile.full_name)}
              </span>
              <span className="text-foreground">
                {profile.full_name}
                <span className="ml-1 text-xs text-muted">({ROLE_LABEL[profile.role] ?? profile.role})</span>
              </span>
            </div>
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
