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
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex items-center gap-4 overflow-x-auto text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link href="/dashboard" className="flex shrink-0 items-center gap-2 whitespace-nowrap font-semibold text-foreground">
              <Image src="/wecare-logo.png" alt="WeCare" width={140} height={60} className="h-6 w-auto" priority />
              Portal
            </Link>
            <Link href="/dashboard" className="shrink-0 whitespace-nowrap text-muted hover:text-foreground">
              Meus contatos
            </Link>
            <Link href="/dashboard/templates" className="shrink-0 whitespace-nowrap text-muted hover:text-foreground">
              Mensagens
            </Link>
            <a
              href="https://wecare-radar.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              📡 Radar
            </a>
          </nav>
          <div className="flex items-center gap-3 overflow-x-auto text-sm text-muted [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="shrink-0 whitespace-nowrap">{profile.full_name}</span>
            <form action={logout} className="shrink-0">
              <button type="submit" className="whitespace-nowrap text-muted hover:text-foreground">
                Sair
              </button>
            </form>
            <span className="shrink-0">
              <ThemeToggle />
            </span>
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
