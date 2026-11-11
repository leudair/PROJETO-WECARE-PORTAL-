import { requireFinance } from "@/lib/data/auth";
import { logout } from "@/app/logout-action";
import { Sidebar, type SidebarNavItem } from "@/components/sidebar";
import { AiIcon, CrmIcon, OverviewIcon, EmployeesIcon, FinanceIcon, RadarIcon, SiteIcon, TelegramIcon } from "@/components/icons";
import { getEmployeeAiUrl, getEmployeeSiteUrl } from "@/lib/employee-site";

const ROLE_LABEL: Record<string, string> = {
  admin: "CEO",
  manager: "Gerente",
  financeiro: "Financeiro",
};

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireFinance();
  const canSeeAdmin = profile.role === "admin" || profile.role === "manager";
  const mySiteUrl = getEmployeeSiteUrl(profile.full_name);
  const myAiUrl = getEmployeeAiUrl(profile.full_name);

  const navItems: SidebarNavItem[] = [
    ...(canSeeAdmin ? [{ href: "/admin", label: "Visão geral", icon: <OverviewIcon className="h-5 w-5" /> }] : []),
    { href: "/financeiro", label: "Financeiro", icon: <FinanceIcon className="h-5 w-5" />, matchPrefix: true },
    // "Mensagens" (funil de lead) em stand-by — ver (admin)/layout.tsx
    ...(canSeeAdmin
      ? [{ href: "/admin/employees", label: "Funcionários", icon: <EmployeesIcon className="h-5 w-5" /> }]
      : []),
    ...(mySiteUrl ? [{ href: mySiteUrl, label: "Meu site", icon: <SiteIcon className="h-5 w-5" />, external: true }] : []),
    ...(myAiUrl ? [{ href: myAiUrl, label: "Minha IA", icon: <AiIcon className="h-5 w-5" />, external: true }] : []),
    { href: "https://radar.portalwecare.com.br", label: "Radar", icon: <RadarIcon className="h-5 w-5" />, external: true },
    { href: "https://t.me/agenciawecare_bot", label: "Bot de avisos", icon: <TelegramIcon className="h-5 w-5" />, external: true },
    { href: "#", label: "CRM", icon: <CrmIcon className="h-5 w-5" />, disabled: true },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <Sidebar navItems={navItems} userName={profile.full_name} roleLabel={ROLE_LABEL[profile.role] ?? profile.role} logoutAction={logout} />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
