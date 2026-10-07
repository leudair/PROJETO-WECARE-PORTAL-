import Link from "next/link";
import { listOverview, listEmployeeContactSummaries } from "@/lib/data/admin";
import { listMonthlyRevenueEntries } from "@/lib/data/finance";
import { PageHeader } from "@/components/page-header";
import { MonthlyRevenueChart, type RevenueEntry } from "./monthly-revenue-chart";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function AdminOverviewPage() {
  const [{ moneyOnTable }, employeeSummaries, monthlyRevenueRows] = await Promise.all([
    listOverview(),
    listEmployeeContactSummaries(),
    listMonthlyRevenueEntries(),
  ]);

  const revenueEntries: RevenueEntry[] = monthlyRevenueRows.map(({ entry, employeeName }) => ({
    employeeName,
    monthKey: entry.month_start_date.slice(0, 7),
    faturamento: entry.faturamento,
  }));

  return (
    <div className="space-y-10">
      <PageHeader title="Visão geral" description="Faturamento da equipe e acompanhamento de leads." />

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
                <div key={employee.id} className="relative overflow-hidden rounded-2xl border border-border bg-surface">
                  <div
                    className="absolute inset-y-0 left-0 bg-primary/10"
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
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
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
  );
}
