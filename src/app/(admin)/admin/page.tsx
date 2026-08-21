import Link from "next/link";
import { listOverview, listEmployeeContactSummaries, type SummaryPeriod } from "@/lib/data/admin";

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
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Visão geral</h1>
        <p className="text-sm text-muted">
          Todos os lembretes cadastrados pelos funcionários e o status de disparo/resposta.
        </p>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Taxa de resposta por funcionário</h2>
          <div className="flex gap-1 text-xs">
            {(Object.keys(PERIOD_LABEL) as SummaryPeriod[]).map((p) => (
              <Link
                key={p}
                href={`/admin?period=${p}`}
                className={
                  p === period
                    ? "rounded-md bg-primary px-2 py-1 text-primary-foreground"
                    : "rounded-md border border-border px-2 py-1 text-muted hover:text-foreground"
                }
              >
                {PERIOD_LABEL[p]}
              </Link>
            ))}
          </div>
        </div>
        {responseSummary.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
            Nenhum funcionário cadastrado ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                    ? "text-green-600 dark:text-green-400"
                    : responseRate >= 0.4
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-red-600 dark:text-red-400";
              return (
                <div key={employee.id} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground">{employee.full_name}</h3>
                    <span className={`text-xl font-bold ${textColor}`}>
                      {responseRate === null ? "—" : `${pct}%`}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-[10px] uppercase text-muted">Enviados</p>
                      <p className="font-semibold text-foreground">{sent}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted">Resp.</p>
                      <p className="font-semibold text-foreground">{replied}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted">Aguard.</p>
                      <p className="font-semibold text-foreground">{pending}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-muted">Falhas</p>
                      <p className="font-semibold text-foreground">{failed}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-foreground">Dinheiro na mesa</h2>
          <p className="text-xs text-muted">
            Soma do valor de interesse dos leads ainda não convertidos, por funcionário — quem tem mais aqui
            está convertendo pior e vale acompanhar de perto.
          </p>
        </div>
        {moneyOnTable.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
            Nenhum lead em aberto no momento.
          </div>
        ) : (
          <div className="space-y-2">
            {(() => {
              const maxTotal = Math.max(...moneyOnTable.map((r) => r.total), 1);
              return moneyOnTable.map(({ employee, total, count }, i) => (
                <div
                  key={employee.id}
                  className="relative overflow-hidden rounded-xl border border-red-200 bg-surface dark:border-red-900/50"
                >
                  <div
                    className="absolute inset-y-0 left-0 bg-red-100 dark:bg-red-950/40"
                    style={{ width: `${(total / maxTotal) * 100}%` }}
                  />
                  <div className="relative flex items-center justify-between gap-2 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted">{i + 1}º</span>
                      <span className="font-medium text-foreground">{employee.full_name}</span>
                      <span className="text-xs text-muted">
                        {count} lead{count === 1 ? "" : "s"} em aberto
                      </span>
                    </div>
                    <span className="font-bold text-red-700 dark:text-red-400">{formatCurrency(total)}</span>
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-foreground">Lembretes por funcionário</h2>
          <p className="text-xs text-muted">Clique num funcionário pra ver todos os lembretes cadastrados por ele.</p>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-background text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Funcionário</th>
                <th className="px-4 py-2">Clientes</th>
                <th className="px-4 py-2">Leads</th>
                <th className="px-4 py-2">Total</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {employeeSummaries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted">
                    Nenhum funcionário cadastrado ainda.
                  </td>
                </tr>
              )}
              {employeeSummaries.map(({ employee, total, leads, clientes }) => (
                <tr key={employee.id} className="border-t border-border">
                  <td className="px-4 py-2 text-foreground">{employee.full_name}</td>
                  <td className="px-4 py-2 text-muted">{clientes}</td>
                  <td className="px-4 py-2 text-muted">{leads}</td>
                  <td className="px-4 py-2 text-muted">{total}</td>
                  <td className="px-4 py-2 text-right">
                    <Link
                      href={`/admin/funcionario/${employee.id}`}
                      className="rounded-md border border-border px-2 py-1 text-xs text-primary hover:bg-surface-2"
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
