import { requireProfile } from "@/lib/data/auth";
import { logout } from "@/app/logout-action";
import { Sidebar, type SidebarNavItem } from "@/components/sidebar";
import { OverviewIcon, MessagesIcon, RadarIcon } from "@/components/icons";
import { NoticeBanner } from "./notice-banner";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  const navItems: SidebarNavItem[] = [
    { href: "/dashboard", label: "Meus contatos", icon: <OverviewIcon className="h-5 w-5" /> },
    { href: "/dashboard/templates", label: "Mensagens", icon: <MessagesIcon className="h-5 w-5" /> },
    { href: "https://wecare-radar.vercel.app", label: "Radar", icon: <RadarIcon className="h-5 w-5" />, external: true },
  ];

  return (
    <div className="flex min-h-screen bg-background">
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
