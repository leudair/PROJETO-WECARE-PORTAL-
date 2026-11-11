import { getCurrentProfile } from "@/lib/data/auth";
import { getOwnSalesHistory, listOwnContactDateSummaries } from "@/lib/data/contacts";
import { todayInSaoPaulo } from "@/lib/date";
import { PageHeader } from "@/components/page-header";
import { DateJump } from "./date-jump";
import { DateList } from "./date-list";
import { MonthlyGoal } from "./monthly-goal";
import { MySalesChart } from "./my-sales-chart";
import { NewContactModal } from "./new-contact-modal";
import { Podium } from "./podium";

export default async function DashboardPage() {
  const [profile, dateSummaries, salesHistory] = await Promise.all([
    getCurrentProfile(),
    listOwnContactDateSummaries(),
    getOwnSalesHistory(),
  ]);

  const now = new Date();
  const monthToDateTotal = salesHistory
    .filter((sale) => {
      const d = new Date(sale.converted_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum, sale) => sum + sale.last_purchase_value, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Meus lembretes"
        description="Cadastre quando e quem contatar — o aviso chega automaticamente pelo Telegram na data certa."
        action={<NewContactModal />}
      />

      <MonthlyGoal monthToDateTotal={monthToDateTotal} goal={profile?.monthly_goal ?? null} />

      <MySalesChart entries={salesHistory} />

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-foreground">Próximos contatos</h2>
          <DateJump today={todayInSaoPaulo()} />
        </div>

        {dateSummaries.length === 0 ? (
          <div className="card-glass p-6 text-center text-sm text-muted">Nenhum lembrete cadastrado ainda.</div>
        ) : (
          <DateList dates={dateSummaries} />
        )}
      </div>

      <Podium />
    </div>
  );
}
