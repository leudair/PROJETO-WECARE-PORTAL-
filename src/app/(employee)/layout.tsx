import Image from "next/image";
import Link from "next/link";
import { requireProfile } from "@/lib/data/auth";
import { logout } from "@/app/logout-action";
import { ThemeToggle } from "@/components/theme-toggle";
import { NoticeBanner } from "./notice-banner";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-foreground">
              <Image src="/wecare-logo.png" alt="WeCare" width={140} height={60} className="h-6 w-auto" priority />
              Portal
            </Link>
            <Link href="/dashboard" className="text-muted hover:text-foreground">
              Meus contatos
            </Link>
            <Link href="/dashboard/templates" className="text-muted hover:text-foreground">
              Mensagens
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
      <main className="mx-auto max-w-3xl px-4 py-8">
        <NoticeBanner />
        {children}
      </main>
    </div>
  );
}
