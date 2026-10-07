import Link from "next/link";
import { listOverview, listEmployeeContactSummaries, type SummaryPeriod } from "@/lib/data/admin";
import { PageHeader } from "@/components/page-header";

const PERIOD_LABEL: Record<SummaryPeriod, string> = {
  today: "Hoje",
  "7d": "Últimos 7 dias",
  all: "Total",
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period: SummaryPeriod = periodParam === "7d" || periodParam === "all" ? periodParam : "today";
  const [{ responseSummary, moneyOnTable }, employeeSummaries] = await Promise.all([
    listOverview(period),
    listEmployeeContactSummaries(),
  ]);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Visão geral"
        description="Todos os lembretes cadastrados pelos funcionários e o status de disparo/resposta."
      />

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-foreground">Taxa de resposta por funcionário</h2>
          <div className="flex gap-1.5 text-xs">
            {(Object.keys(PERIOD_LABEL) as SummaryPeriod[]).map((p) => (
              <Link
                key={p}
                href={`/admin?period=${p}`}
                className={
                  p === period
                    ? "rounded-lg bg-primary px-3 py-1.5 font-semibold text-primary-foreground"
                    : "rounded-lg border border-border px-3 py-1.5 font-medium text-muted hover:text-foreground"
                }
              >
                {PERIOD_LABEL[p]}
              </Link>
            ))}
          </div>
        </div>
        {responseSummary.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted">
            Nenhum funcionário cadastrado ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {responseSummary.map(({ employee, sent, replied, pending, failed, responseRate }) => {
              const pct = responseRate === null ? 0 : Math.round(responseRate * 100);
              const barColor =
                responseRate === null
                  ? "bg-surface-2"
                  : responseRate >= 0.7
                    ? "bg-green-500"
                    : responseRate >= 0.4
                      ? "bg-yellow-500"
                      : "bg-red-500";
              const textColor =
                responseRate === null
                  ? "text-muted"
                  : responseRate >= 0.7
                    ? "text-green-400"
                    : responseRate >= 0.4
                      ? "text-yellow-400"
                      : "text-red-400";
              return (
                <div key={employee.id} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-foreground">{employee.full_name}</h3>
                    <span className={`text-2xl font-bold tabular-nums ${textColor}`}>
                      {responseRate === null ? "—" : `${pct}%`}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">Enviados</p>
                      <p className="font-bold text-foreground">{sent}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">Resp.</p>
                      <p className="font-bold text-foreground">{replied}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">Aguard.</p>
                      <p className="font-bold text-foreground">{pending}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">Falhas</p>
                      <p className="font-bold text-foreground">{failed}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
