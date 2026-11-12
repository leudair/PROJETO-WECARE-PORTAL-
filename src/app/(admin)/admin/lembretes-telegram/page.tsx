import { PageHeader } from "@/components/page-header";
import { getAdminTelegramReport, normalizeMonth } from "@/lib/data/telegram-report";
import { MonthFilter, ReminderList, SellerTable, TotalsCards } from "@/components/telegram-report/report-view";

export default async function AdminTelegramReportPage({ searchParams }: { searchParams: Promise<{ mes?: string; vendedora?: string }> }) {
  const { mes, vendedora } = await searchParams;
  const month = normalizeMonth(mes);
  const seller = vendedora || undefined;
  const { rows, summary } = await getAdminTelegramReport(month, seller);
  const shownSummary = seller ? summary.filter((s) => s.key === seller) : summary;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lembretes do Telegram"
        description="Lembretes que o bot mandou pra cada vendedora, com a última compra do cliente, o valor sugerido e se o cliente comprou depois."
        action={<MonthFilter month={month} seller={seller} sellers={summary} />}
      />
      <TotalsCards summary={shownSummary} />
      {!seller && <SellerTable summary={summary} />}
      <ReminderList rows={rows} showSeller={!seller} />
    </div>
  );
}
