import { requireProfile } from "@/lib/data/auth";
import { logout } from "@/app/logout-action";
import { Sidebar, type SidebarNavItem } from "@/components/sidebar";
import { AiIcon, CrmIcon, OverviewIcon, RadarIcon, SiteIcon } from "@/components/icons";
import { NoticeBanner } from "./notice-banner";
import { getEmployeeAiUrl, getEmployeeSiteUrl } from "@/lib/employee-site";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const mySiteUrl = getEmployeeSiteUrl(profile.full_name);
  const myAiUrl = getEmployeeAiUrl(profile.full_name);

  const navItems: SidebarNavItem[] = [
    { href: "/dashboard", label: "Meus contatos", icon: <OverviewIcon className="h-5 w-5" /> },
    // "Mensagens" (funil de lead) em stand-by — ver (admin)/layout.tsx
    ...(mySiteUrl ? [{ href: mySiteUrl, label: "Meu site", icon: <SiteIcon className="h-5 w-5" />, external: true }] : []),
    ...(myAiUrl ? [{ href: myAiUrl, label: "Minha IA", icon: <AiIcon className="h-5 w-5" />, external: true }] : []),
    { href: "https://radar.portalwecare.com.br", label: "Radar", icon: <RadarIcon className="h-5 w-5" />, external: true },
    { href: "#", label: "CRM", icon: <CrmIcon className="h-5 w-5" />, disabled: true },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <Sidebar navItems={navItems} userName={profile.full_name} roleLabel="Funcionária" logoutAction={logout} />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-5xl">
          <NoticeBanner />
          {children}
        </div>
      </main>
    </div>
  );
}
