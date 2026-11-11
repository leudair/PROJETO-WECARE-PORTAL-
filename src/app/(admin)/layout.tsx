import { requireAdmin } from "@/lib/data/auth";
import { logout } from "@/app/logout-action";
import { Sidebar, type SidebarNavItem } from "@/components/sidebar";
import { AiIcon, CrmIcon, OverviewIcon, EmployeesIcon, FinanceIcon, RadarIcon, SiteIcon } from "@/components/icons";
import { getEmployeeAiUrl, getEmployeeSiteUrl } from "@/lib/employee-site";

const ROLE_LABEL: Record<string, string> = {
  admin: "CEO",
  manager: "Gerente",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();
  const mySiteUrl = getEmployeeSiteUrl(profile.full_name);
  const myAiUrl = getEmployeeAiUrl(profile.full_name);

  const navItems: SidebarNavItem[] = [
    { href: "/admin", label: "Visão geral", icon: <OverviewIcon className="h-5 w-5" /> },
    { href: "/financeiro", label: "Financeiro", icon: <FinanceIcon className="h-5 w-5" />, matchPrefix: true },
    { href: "/admin/employees", label: "Funcionários", icon: <EmployeesIcon className="h-5 w-5" /> },
    // "Mensagens" (funil de lead) em stand-by — pedido pra tirar do menu sem
    // apagar a tela/dados, pra religar depois se decidirem usar.
    ...(mySiteUrl ? [{ href: mySiteUrl, label: "Meu site", icon: <SiteIcon className="h-5 w-5" />, external: true }] : []),
    ...(myAiUrl ? [{ href: myAiUrl, label: "Minha IA", icon: <AiIcon className="h-5 w-5" />, external: true }] : []),
    { href: "https://radar.portalwecare.com.br", label: "Radar", icon: <RadarIcon className="h-5 w-5" />, external: true },
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
