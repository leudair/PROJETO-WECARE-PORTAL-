import Link from "next/link";
import { listOverview, listEmployeeContactSummaries } from "@/lib/data/admin";
import { listMonthlyRevenueEntries } from "@/lib/data/finance";
import { PageHeader } from "@/components/page-header";
import { todayInSaoPaulo } from "@/lib/date";
import { MonthlyRevenueChart, type RevenueEntry } from "./monthly-revenue-chart";
import { OverviewKpis } from "./overview-kpis";

const MONTH_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const KPI_MONTHS_BACK = 5; // + mes atual = 6 pontos no sparkline, igual ao grafico de faturamento

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Ultimos 6 meses (rotulo + chave "YYYY-MM"), a partir da data do servidor
// em horario de Sao Paulo — mesma janela que o grafico de faturamento usa,
// so que calculada aqui (server) por string em vez de Date local do browser.
function lastMonths(count: number) {
  const [year, month] = todayInSaoPaulo().slice(0, 7).split("-").map(Number);
  const months = [];
  for (let i = count; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    months.push({ key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`, label: MONTH_ABBR[d.getUTCMonth()] });
  }
  return months;
}

export default async function AdminOverviewPage() {
  const [{ moneyOnTable, responseSummary }, employeeSummaries, monthlyRevenueRows] = await Promise.all([
    listOverview(),
    listEmployeeContactSummaries(),
    listMonthlyRevenueEntries(),
  ]);

  const revenueEntries: RevenueEntry[] = monthlyRevenueRows.map(({ entry, employeeName }) => ({
    employeeName,
    monthKey: entry.month_start_date.slice(0, 7),
    faturamento: entry.faturamento,
  }));

  const revenueSeries = lastMonths(KPI_MONTHS_BACK).map(({ key, label }) => ({
    label,
    total: revenueEntries.filter((e) => e.monthKey === key).reduce((sum, e) => sum + e.faturamento, 0),
  }));

  const responseTotals = responseSummary.reduce(
    (acc, r) => ({ sent: acc.sent + r.sent, replied: acc.replied + r.replied }),
    { sent: 0, replied: 0 },
  );

  return (
    <div className="space-y-10">
      <PageHeader title="Visão geral" description="Faturamento da equipe e acompanhamento de leads." />

      <OverviewKpis
        revenueSeries={revenueSeries}
        moneyOnTableTotal={moneyOnTable.reduce((sum, r) => sum + r.total, 0)}
        moneyOnTableCount={moneyOnTable.reduce((sum, r) => sum + r.count, 0)}
        responseSent={responseTotals.sent}
        responseReplied={responseTotals.replied}
      />

      <MonthlyRevenueChart entries={revenueEntries} />

      <div>
        <div className="mb-4">
          <h2 className="text-base font-bold text-foreground">Dinheiro na mesa</h2>
          <p className="mt-0.5 text-xs text-muted">
            Soma do valor de interesse dos leads ainda não convertidos, por funcionário — quem tem mais aqui
            está convertendo pior e vale acompanhar de perto.
          </p>
        </div>
        {moneyOnTable.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted">
            Nenhum lead em aberto no momento.
          </div>
        ) : (
          <div className="space-y-2.5">
            {(() => {
              const maxTotal = Math.max(...moneyOnTable.map((r) => r.total), 1);
              return moneyOnTable.map(({ employee, total, count }, i) => (
                <div key={employee.id} className="card-glass relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500/20 to-red-500/5"
                    style={{ width: `${(total / maxTotal) * 100}%` }}
                  />
                  <div className="relative flex items-center justify-between gap-2 px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted">{i + 1}º</span>
                      <span className="font-semibold text-foreground">{employee.full_name}</span>
                      <span className="text-xs text-muted">
                        {count} lead{count === 1 ? "" : "s"} em aberto
                      </span>
                    </div>
                    <span className="text-lg font-bold tabular-nums text-red-400">{formatCurrency(total)}</span>
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      <div>
        <div className="mb-4">
          <h2 className="text-base font-bold text-foreground">Lembretes por funcionário</h2>
          <p className="mt-0.5 text-xs text-muted">Clique num funcionário pra ver todos os lembretes cadastrados por ele.</p>
        </div>
        <div className="card-glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-surface-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3">Funcionário</th>
                  <th className="px-5 py-3">Clientes</th>
                  <th className="px-5 py-3">Leads</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {employeeSummaries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted">
                      Nenhum funcionário cadastrado ainda.
                    </td>
                  </tr>
                )}
                {employeeSummaries.map(({ employee, total, leads, clientes }) => (
                  <tr key={employee.id} className="border-t border-border hover:bg-surface-2/60">
                    <td className="px-5 py-3 font-medium text-foreground">{employee.full_name}</td>
                    <td className="px-5 py-3 text-muted">{clientes}</td>
                    <td className="px-5 py-3 text-muted">{leads}</td>
                    <td className="px-5 py-3 text-muted">{total}</td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/funcionario/${employee.id}`}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-primary hover:bg-surface-2"
                      >
                        Ver lembretes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
