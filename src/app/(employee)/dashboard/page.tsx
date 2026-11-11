import { listOwnContactDateSummaries } from "@/lib/data/contacts";
import { todayInSaoPaulo } from "@/lib/date";
import { PageHeader } from "@/components/page-header";
import { ContactForm } from "./contact-form";
import { DateJump } from "./date-jump";
import { DateList } from "./date-list";
import { Podium } from "./podium";

export default async function DashboardPage() {
  const dateSummaries = await listOwnContactDateSummaries();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Meus lembretes"
        description="Cadastre quando e quem contatar — o aviso chega automaticamente pelo Telegram na data certa."
      />

      <ContactForm />

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-foreground">Próximos contatos</h2>
          <DateJump today={todayInSaoPaulo()} />
        </div>

        {dateSummaries.length === 0 ? (
          <div className="card-glass p-6 text-center text-sm text-muted">Nenhum lembrete cadastrado ainda.</div>
        ) : (
          <DateList dates={dateSummaries} />
        )}
      </div>

      <Podium />
    </div>
  );
}
