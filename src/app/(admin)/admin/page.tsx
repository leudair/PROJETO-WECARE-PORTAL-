import { listFaturamentoMensalEmpresa } from "@/lib/data/admin";
import { PageHeader } from "@/components/page-header";
import { CompanyRevenueChart } from "./company-revenue-chart";
import { CompanyRevenueYearChart } from "./company-revenue-year-chart";

// Visao geral: so grafico, informacao da empresa como um todo — os dados por
// funcionaria (dinheiro na mesa, lembretes) moraram pra "Equipe hoje", que ja
// e a pagina de acompanhamento por pessoa.
export default async function AdminOverviewPage() {
  const faturamentoMensalEmpresa = await listFaturamentoMensalEmpresa();

  return (
    <div className="space-y-6">
      <PageHeader title="Visão geral" description="Faturamento da empresa em gráficos." />

      <CompanyRevenueChart data={faturamentoMensalEmpresa} />
      <CompanyRevenueYearChart data={faturamentoMensalEmpresa} />
    </div>
  );
}
