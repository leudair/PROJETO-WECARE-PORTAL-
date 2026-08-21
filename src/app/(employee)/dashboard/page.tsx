import Link from "next/link";
import { listOwnContactDateSummaries } from "@/lib/data/contacts";
import { ContactForm } from "./contact-form";
import { Podium } from "./podium";

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

export default async function DashboardPage() {
  const dateSummaries = await listOwnContactDateSummaries();

  return (
    <div className="space-y-8">
      <ContactForm />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Meus lembretes</h2>

        {dateSummaries.length === 0 && (
          <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
            Nenhum lembrete cadastrado ainda.
          </div>
        )}

        <div className="space-y-2">
          {dateSummaries.map(({ date, total, leads, clientes }) => (
            <Link
              key={date}
              href={`/dashboard/dia/${date}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-4 hover:bg-surface-2"
            >
              <div>
                <p className="font-semibold text-foreground">Lembretes de {formatDate(date)}</p>
                <p className="text-xs text-muted">
                  {clientes} cliente{clientes === 1 ? "" : "s"} · {leads} lead{leads === 1 ? "" : "s"}
                </p>
              </div>
              <span className="rounded-md border border-border px-3 py-1 text-xs text-primary">
                {total} lembrete{total === 1 ? "" : "s"} →
              </span>
            </Link>
          ))}
        </div>
      </div>

      <Podium />
    </div>
  );
}
