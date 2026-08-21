import { listOwnContactDateSummaries } from "@/lib/data/contacts";
import { todayInSaoPaulo } from "@/lib/date";
import { ContactForm } from "./contact-form";
import { DateJump } from "./date-jump";
import { DateList } from "./date-list";
import { Podium } from "./podium";

export default async function DashboardPage() {
  const dateSummaries = await listOwnContactDateSummaries();

  return (
    <div className="space-y-8">
      <ContactForm />

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Meus lembretes</h2>
          <DateJump today={todayInSaoPaulo()} />
        </div>

        {dateSummaries.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
            Nenhum lembrete cadastrado ainda.
          </div>
        ) : (
          <DateList dates={dateSummaries} />
        )}
      </div>

      <Podium />
    </div>
  );
}
