import { requireProfile } from "@/lib/data/auth";
import { logout } from "@/app/logout-action";
import { Sidebar, type SidebarNavItem } from "@/components/sidebar";
import { AiIcon, BellIcon, CrmIcon, MeetingIcon, OverviewIcon, RadarIcon, SiteIcon, TelegramIcon } from "@/components/icons";
import { NoticeBanner } from "./notice-banner";
import { getEmployeeAiUrl, getEmployeeSiteUrl } from "@/lib/employee-site";
import { expedienteDeHoje, temCodigo } from "@/lib/data/portal";
import { AbrirDiaPortao } from "./abrir-dia-portao";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const mySiteUrl = getEmployeeSiteUrl(profile.full_name);
  const myAiUrl = getEmployeeAiUrl(profile.full_name);
  // Painel abre travado: primeiro cria o codigo, depois assina para abrir o dia.
  const [possuiCodigo, expediente] = await Promise.all([temCodigo(), expedienteDeHoje(profile.id)]);
  const diaAberto = possuiCodigo === null || Boolean(expediente);

  const navItems: SidebarNavItem[] = [
    { href: "/dashboard", label: "Meus contatos", icon: <OverviewIcon className="h-5 w-5" /> },
    { href: "/dashboard/fechar-dia", label: "Fechar o dia", icon: <BellIcon className="h-5 w-5" /> },
    // "Mensagens" (funil de lead) em stand-by — ver (admin)/layout.tsx
    ...(mySiteUrl ? [{ href: mySiteUrl, label: "Meu site", icon: <SiteIcon className="h-5 w-5" />, external: true }] : []),
    ...(myAiUrl ? [{ href: myAiUrl, label: "Minha IA", icon: <AiIcon className="h-5 w-5" />, external: true }] : []),
    { href: "https://radar.portalwecare.com.br", label: "Radar", icon: <RadarIcon className="h-5 w-5" />, external: true },
    { href: "https://t.me/agenciawecare_bot", label: "Bot de avisos", icon: <TelegramIcon className="h-5 w-5" />, external: true },
    // Agente conectado na plataforma (selecionar clientes por criterio, ver vendas da IA, etc) — ainda nao existe.
    { href: "#", label: "Agente", icon: <AiIcon className="h-5 w-5" />, disabled: true },
    { href: "#", label: "Reunião", icon: <MeetingIcon className="h-5 w-5" />, disabled: true },
    { href: "#", label: "CRM", icon: <CrmIcon className="h-5 w-5" />, disabled: true },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <Sidebar navItems={navItems} userName={profile.full_name} roleLabel="Funcionária" logoutAction={logout} avatarUrl={profile.avatar_url} />
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-5xl">
          {diaAberto ? (
            <>
              <NoticeBanner />
              {children}
            </>
          ) : (
            <AbrirDiaPortao nome={profile.full_name} possuiCodigo={Boolean(possuiCodigo)} />
          )}
        </div>
      </main>
    </div>
  );
}
