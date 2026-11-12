import { listOwnContactDateSummaries } from "@/lib/data/contacts";
import { todayInSaoPaulo } from "@/lib/date";
import { requireProfile } from "@/lib/data/auth";
import { lembretesTelegram } from "@/lib/data/portal";
import { TelegramLembretes } from "@/components/telegram-lembretes";
import { ContactForm } from "./contact-form";
import { DateJump } from "./date-jump";
import { DateList } from "./date-list";
import { Podium } from "./podium";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const [dateSummaries, telegram] = await Promise.all([
    listOwnContactDateSummaries(),
    lembretesTelegram(profile.id, 30, 100),
  ]);

  return (
    <div className="space-y-8">
      <ContactForm />

      {telegram && <TelegramLembretes dados={telegram} mostrarLista />}

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
