import Link from "next/link";
import { notFound } from "next/navigation";
import { listEmployeeContactsPaginated, UNANSWERED_STREAK_ALERT } from "@/lib/data/admin";
import { NoticeForm } from "../../employees/notice-form";

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

export default async function EmployeeContactsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  let data;
  try {
    data = await listEmployeeContactsPaginated(id, page);
  } catch {
    notFound();
  }

  const { employee, rows, totalCount, totalPages } = data;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-xs text-primary hover:underline">
          ← Voltar pra Visão geral
        </Link>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-foreground">{employee.full_name}</h1>
          <NoticeForm employeeId={employee.id} />
        </div>
        <p className="text-sm text-muted">
          {totalCount} lembrete{totalCount === 1 ? "" : "s"} cadastrado{totalCount === 1 ? "" : "s"}. Cards em
          vermelho: {UNANSWERED_STREAK_ALERT}+ reenvios seguidos sem resposta.
        </p>
      </div>

      {rows.length === 0 && (
        <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
          Nenhum lembrete cadastrado ainda.
        </div>
      )}

      <div className="space-y-3">
        {rows.map(({ contact, latestDispatch, unansweredStreak }) => (
          <div
            key={contact.id}
            className={
              unansweredStreak >= UNANSWERED_STREAK_ALERT
                ? "rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30"
                : "rounded-xl border border-border bg-surface p-4"
            }
          >
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-1">
              <h3 className="font-semibold text-foreground">
                {contact.name}
                {contact.instagram_handle && (
                  <span className="ml-1 font-normal text-muted">@{contact.instagram_handle}</span>
                )}
              </h3>
              <span className="text-xs text-muted">
                {contact.contact_type === "cliente" ? "Cliente" : `Lead · ${contact.attempt_stage}ª tentativa`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-background p-2">
                <p className="text-[10px] uppercase text-muted">Telefone</p>
                <p className="font-medium text-foreground">{contact.phone}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-2">
                <p className="text-[10px] uppercase text-muted">Última compra</p>
                {contact.last_purchase_value != null ? (
                  <p className="font-semibold text-green-700 dark:text-green-400">
                    {formatCurrency(contact.last_purchase_value)}
                  </p>
                ) : (
                  <p className="text-muted">—</p>
                )}
              </div>
              <div className="rounded-lg border border-border bg-background p-2">
                <p className="text-[10px] uppercase text-muted">Contato em</p>
                <p className="font-medium text-foreground">{formatDate(contact.next_contact_date)}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-2">
                <p className="text-[10px] uppercase text-muted">Último disparo</p>
                <p className="font-medium text-foreground">{formatDateTime(latestDispatch?.sent_at ?? null)}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
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
                <span className="text-xs text-red-700 dark:text-red-400">
                  {unansweredStreak}x sem resposta
                </span>
              )}
              {latestDispatch?.flagged_suspicious && (
                <span
                  title="Confirmado rápido demais pra ser plausível — vale checar de verdade"
                  className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
                >
                  ⚠️ confirmação suspeita
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center gap-1 pt-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/funcionario/${id}?page=${p}`}
              className={
                p === page
                  ? "rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground"
                  : "rounded-md border border-border px-3 py-1 text-xs text-muted hover:text-foreground"
              }
            >
              Página {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
