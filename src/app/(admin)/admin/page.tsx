import Link from "next/link";
import { listOverview, UNANSWERED_STREAK_ALERT, type SummaryPeriod } from "@/lib/data/admin";

const PERIOD_LABEL: Record<SummaryPeriod, string> = {
  today: "Hoje",
  "7d": "Últimos 7 dias",
  all: "Total",
};

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const DISPATCH_LABEL: Record<string, string> = {
  scheduled: "Agendado",
  sent: "Enviado · aguardando resposta",
  replied: "Respondido",
  failed: "Falha no envio",
};

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period: SummaryPeriod = periodParam === "7d" || periodParam === "all" ? periodParam : "today";
  const { rows, responseSummary } = await listOverview(period);

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
        <h2 className="text-sm font-semibold text-foreground">Todos os lembretes</h2>
        <p className="text-xs text-muted">
          Linhas em vermelho: {UNANSWERED_STREAK_ALERT}+ reenvios seguidos sem o funcionário responder.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-background text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-2">Funcionário</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Última compra</th>
              <th className="px-4 py-2">Contato em</th>
              <th className="px-4 py-2">Último disparo</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted">
                  Nenhum lembrete cadastrado ainda.
                </td>
              </tr>
            )}
            {rows.map(({ contact, owner, latestDispatch, unansweredStreak }) => (
              <tr
                key={contact.id}
                className={
                  unansweredStreak >= UNANSWERED_STREAK_ALERT
                    ? "border-t border-border bg-red-50 dark:bg-red-950/30"
                    : "border-t border-border"
                }
              >
                <td className="px-4 py-2">{owner?.full_name ?? "—"}</td>
                <td className="px-4 py-2">
                  {contact.name}
                  {contact.instagram_handle && (
                    <span className="ml-1 text-muted">@{contact.instagram_handle}</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {contact.contact_type === "cliente" ? "Cliente" : `Lead · ${contact.attempt_stage}ª`}
                </td>
                <td className="px-4 py-2 text-muted">
                  {contact.last_purchase_value != null ? formatCurrency(contact.last_purchase_value) : "—"}
                </td>
                <td className="px-4 py-2 text-muted">{formatDate(contact.next_contact_date)}</td>
                <td className="px-4 py-2 text-muted">{formatDateTime(latestDispatch?.sent_at ?? null)}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      latestDispatch?.status === "replied"
                        ? "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700"
                        : latestDispatch?.status === "failed"
                          ? "rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700"
                          : "rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted"
                    }
                  >
                    {latestDispatch ? DISPATCH_LABEL[latestDispatch.status] : "Aguardando data"}
                  </span>
                  {unansweredStreak >= UNANSWERED_STREAK_ALERT && (
                    <span className="ml-1 text-xs text-red-700 dark:text-red-400">
                      ({unansweredStreak}x sem resposta)
                    </span>
                  )}
                  {latestDispatch?.flagged_suspicious && (
                    <span
                      title="Confirmado rápido demais pra ser plausível — vale checar de verdade"
                      className="ml-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
                    >
                      ⚠️ confirmação suspeita
                    </span>
                  )}
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
