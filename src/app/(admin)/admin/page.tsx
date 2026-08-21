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
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-background text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Funcionário</th>
                <th className="px-4 py-2">Enviados</th>
                <th className="px-4 py-2">Respondidos</th>
                <th className="px-4 py-2">Aguardando resposta</th>
                <th className="px-4 py-2">Falhas</th>
                <th className="px-4 py-2">Taxa de resposta</th>
              </tr>
            </thead>
            <tbody>
              {responseSummary.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted">
                    Nenhum funcionário cadastrado ainda.
                  </td>
                </tr>
              )}
              {responseSummary.map(({ employee, sent, replied, pending, failed, responseRate }) => (
                <tr key={employee.id} className="border-t border-border">
                  <td className="px-4 py-2">{employee.full_name}</td>
                  <td className="px-4 py-2 text-muted">{sent}</td>
                  <td className="px-4 py-2 text-muted">{replied}</td>
                  <td className="px-4 py-2 text-muted">{pending}</td>
                  <td className="px-4 py-2 text-muted">{failed}</td>
                  <td className="px-4 py-2">
                    {responseRate === null ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <span
                        className={
                          responseRate >= 0.7
                            ? "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700"
                            : responseRate >= 0.4
                              ? "rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700"
                              : "rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700"
                        }
                      >
                        {Math.round(responseRate * 100)}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-foreground">Dinheiro na mesa</h2>
          <p className="text-xs text-muted">
            Soma do valor de interesse dos leads ainda não convertidos, por funcionário — quem tem mais aqui
            está convertendo pior e vale acompanhar de perto.
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-background text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Funcionário</th>
                <th className="px-4 py-2">Leads em aberto</th>
                <th className="px-4 py-2">Valor na mesa</th>
              </tr>
            </thead>
            <tbody>
              {moneyOnTable.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted">
                    Nenhum lead em aberto no momento.
                  </td>
                </tr>
              )}
              {moneyOnTable.map(({ employee, total, count }) => (
                <tr key={employee.id} className="border-t border-border">
                  <td className="px-4 py-2">{employee.full_name}</td>
                  <td className="px-4 py-2 text-muted">{count}</td>
                  <td className="px-4 py-2 font-semibold text-red-700 dark:text-red-400">
                    {formatCurrency(total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
