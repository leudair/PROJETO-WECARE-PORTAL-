import { requireFinance } from "@/lib/data/auth";
import { logout } from "@/app/logout-action";
import { Sidebar, type SidebarNavItem } from "@/components/sidebar";
import { OverviewIcon, EmployeesIcon, MessagesIcon, FinanceIcon, RadarIcon } from "@/components/icons";

const ROLE_LABEL: Record<string, string> = {
  admin: "CEO",
  manager: "Gerente",
  financeiro: "Financeiro",
};

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireFinance();
  const canSeeAdmin = profile.role === "admin" || profile.role === "manager";

  const navItems: SidebarNavItem[] = [
    ...(canSeeAdmin ? [{ href: "/admin", label: "Visão geral", icon: <OverviewIcon className="h-5 w-5" /> }] : []),
    { href: "/financeiro", label: "Financeiro", icon: <FinanceIcon className="h-5 w-5" />, matchPrefix: true },
    ...(canSeeAdmin
      ? [
          { href: "/admin/employees", label: "Funcionários", icon: <EmployeesIcon className="h-5 w-5" /> },
          { href: "/admin/templates", label: "Mensagens", icon: <MessagesIcon className="h-5 w-5" /> },
        ]
      : []),
    { href: "https://wecare-radar.vercel.app", label: "Radar", icon: <RadarIcon className="h-5 w-5" />, external: true },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar navItems={navItems} userName={profile.full_name} roleLabel={ROLE_LABEL[profile.role] ?? profile.role} logoutAction={logout} />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
