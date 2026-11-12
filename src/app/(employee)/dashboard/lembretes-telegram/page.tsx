import { PageHeader } from "@/components/page-header";
import { getMyTelegramReport, normalizeMonth } from "@/lib/data/telegram-report";
import { MonthFilter, ReminderList, TotalsCards } from "@/components/telegram-report/report-view";

export default async function MyTelegramReportPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams;
  const month = normalizeMonth(mes);
  const { rows, summary } = await getMyTelegramReport(month);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meus lembretes do Telegram"
        description="Os lembretes que o bot te mandou, com a última compra do cliente, o valor sugerido e se ele comprou depois."
        action={<MonthFilter month={month} />}
      />
      <TotalsCards summary={summary} />
      <ReminderList rows={rows} showSeller={false} />
    </div>
  );
}
