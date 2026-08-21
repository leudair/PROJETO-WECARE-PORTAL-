import Image from "next/image";
import Link from "next/link";
import { requireFinance } from "@/lib/data/auth";
import { logout } from "@/app/logout-action";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireFinance();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/financeiro" className="flex items-center gap-2 font-semibold text-foreground">
              <Image src="/wecare-logo.png" alt="WeCare" width={140} height={60} className="h-6 w-auto" priority />
              Financeiro
            </Link>
          </nav>
          <div className="flex items-center gap-3 text-sm text-muted">
            <span>{profile.full_name}</span>
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
