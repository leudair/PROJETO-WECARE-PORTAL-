import Link from "next/link";
import { listEmployeesForFinance, listMonthlyRevenueEntries } from "@/lib/data/finance";
import { EntryForm } from "./entry-form";
import { EditEntryButton } from "./edit-entry-button";

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatMonthLabel(monthStartIso: string) {
  const d = new Date(`${monthStartIso}T00:00:00`);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export default async function FaturamentoMensalPage() {
  const [employees, rows] = await Promise.all([listEmployeesForFinance(), listMonthlyRevenueEntries()]);

  const months = new Map<string, { employeeName: string; entry: (typeof rows)[number]["entry"] }[]>();
  for (const row of rows) {
    const key = row.entry.month_start_date;
    const list = months.get(key) ?? [];
    list.push(row);
    months.set(key, list);
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/financeiro" className="text-xs text-muted hover:text-foreground">
          ← Voltar ao faturamento semanal
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-foreground">Faturamento mensal</h1>
        <p className="text-sm text-muted">
          Informe o faturamento total do mês de cada funcionária, separado do lançamento semanal.
        </p>
      </div>

      <EntryForm employees={employees} />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Lançamentos</h2>
        <div className="space-y-4">
          {months.size === 0 && (
            <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
              Nenhum lançamento ainda.
            </div>
          )}
          {[...months.entries()].map(([monthStartDate, entries]) => {
            const total = entries.reduce((sum, { entry }) => sum + entry.faturamento, 0);
            return (
              <div key={monthStartDate} className="rounded-xl border border-border bg-surface p-4">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-1">
                  <h3 className="font-semibold text-foreground">{formatMonthLabel(monthStartDate)}</h3>
                  <span className="text-xs text-muted">Total: {formatCurrency(total)}</span>
                </div>
                <div className="space-y-2">
                  {entries.map(({ entry, employeeName }) => (
                    <div key={entry.id} className="rounded-lg border border-border bg-background p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-red-700 dark:text-red-400">{employeeName}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-green-700 dark:text-green-400">
                            {formatCurrency(entry.faturamento)}
                          </span>
                          <EditEntryButton
                            employeeId={entry.employee_id}
                            monthStartDate={entry.month_start_date}
                            faturamento={entry.faturamento}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
