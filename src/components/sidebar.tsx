"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeftIcon, CloseIcon, LogoutIcon, MenuIcon } from "@/components/icons";

export interface SidebarNavItem {
  href: string;
  label: string;
  icon: ReactNode;
  external?: boolean;
  /** Quando a rota atual deve ser considerada "ativa" para alem de match exato. */
  matchPrefix?: boolean;
}

const COLLAPSE_STORAGE_KEY = "wecare-portal-sidebar-collapsed";

// Shell de navegacao compartilhado pelas areas logadas do portal (admin,
// financeiro, funcionaria) — barra lateral recolhivel no desktop, vira um
// drawer com overlay no celular/tablet.
export function Sidebar({
  navItems,
  userName,
  roleLabel,
  logoutAction,
}: {
  navItems: SidebarNavItem[];
  userName: string;
  roleLabel: string;
  logoutAction: () => void | Promise<void>;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // Evita mismatch de hidratacao: o estado recolhido/expandido so e
    // conhecido no client (localStorage), entao o server sempre renderiza
    // expandido e ajusta aqui assim que montar.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura unica de localStorage no mount, ver comentario acima
      setCollapsed(localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1");
    } catch {
      // localStorage indisponivel (ex: navegacao privada) — segue expandido.
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fecha o drawer mobile ao trocar de rota
    setMobileOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ok ignorar
      }
      return next;
    });
  }

  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  function isActive(item: SidebarNavItem) {
    if (item.external) return false;
    if (item.matchPrefix) return pathname.startsWith(item.href);
    return pathname === item.href;
  }

  const navContent = (
    <>
      <div className="flex items-center gap-2.5 px-4 py-5">
        <Image
          src="/icon.png"
          alt="WeCare"
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 rounded-xl object-contain drop-shadow-[0_4px_12px_rgba(196,18,48,0.45)]"
          priority
        />
        {!collapsed && <span className="truncate text-sm font-bold tracking-wide text-foreground">WeCare Portal</span>}
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {navItems.map((item) => {
          const active = isActive(item);
          const content = (
            <>
              <span className={active ? "text-primary" : "text-muted group-hover:text-foreground"}>{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </>
          );
          const className = [
            "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            active
              ? "bg-gradient-to-r from-primary/15 to-transparent text-foreground"
              : "text-muted hover:bg-surface-2 hover:text-foreground",
          ].join(" ");

          return item.external ? (
            <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer" className={className} title={collapsed ? item.label : undefined}>
              {content}
            </a>
          ) : (
            <Link key={item.href} href={item.href} className={className} title={collapsed ? item.label : undefined}>
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary shadow-[0_0_8px_rgba(232,69,94,0.8)]" />
              )}
              {content}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 border-t border-border p-3">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <span className="icon-orb h-8 w-8 shrink-0 text-xs font-bold text-white">{initials || "?"}</span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{userName}</p>
              <p className="truncate text-xs text-muted">{roleLabel}</p>
            </div>
          )}
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-foreground"
            title={collapsed ? "Sair" : undefined}
          >
            <LogoutIcon className="h-4 w-4 shrink-0" />
            {!collapsed && "Sair"}
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* Barra mobile */}
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-gradient-to-b from-surface to-background px-4 py-3 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/icon.png" alt="WeCare" width={28} height={28} className="h-7 w-7 rounded-lg object-contain" />
          <span className="text-sm font-bold text-foreground">WeCare Portal</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <div className="relative flex w-72 max-w-[80vw] flex-col bg-gradient-to-b from-surface to-background">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
              className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-foreground"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
            {navContent}
          </div>
        </div>
      )}

      {/* Sidebar desktop */}
      <aside
        className={[
          "relative hidden h-screen shrink-0 flex-col border-r border-white/[0.06] bg-gradient-to-b from-surface to-background shadow-[inset_-1px_0_0_0_rgba(255,255,255,0.03)] transition-[width] duration-200 md:sticky md:top-0 md:flex",
          collapsed ? "w-[72px]" : "w-64",
        ].join(" ")}
      >
        {navContent}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="absolute -right-3 top-16 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface-2 text-muted hover:text-foreground"
        >
          <ChevronLeftIcon className={`h-3.5 w-3.5 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </aside>
    </>
  );
}
