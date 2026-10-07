import Link from "next/link";
import {
  CUSTO_OPERACIONAL_ALERT_PCT,
  TAX_RATE,
  COMMISSION_RATE,
  VARIABLE_RATE,
  listEmployeesForFinance,
  listFinancialEntries,
} from "@/lib/data/finance";
import { PageHeader } from "@/components/page-header";
import { NewEntryModal } from "./new-entry-modal";
import { CustoRankingButton } from "./custo-ranking-button";
import { formatCurrency, formatWeekRange, MONTH_NAMES } from "./format";

export default async function FinanceiroPage() {
  const [employees, rows] = await Promise.all([listEmployeesForFinance(), listFinancialEntries()]);

  // Soma faturamento e custo operacional do mes atual por funcionaria (nao
  // por lancamento semanal) — com varias semanas acumuladas, o ranking por
  // lancamento ficava confuso demais; uma linha por pessoa, com o total do
  // mes, e' o que da pra bater o olho e achar quem mais gasta.
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const monthLabel = `${MONTH_NAMES[now.getMonth()].toLowerCase()} de ${now.getFullYear()}`;

  const monthlyTotalsByEmployee = new Map<string, { employeeName: string; faturamento: number; custoOperacional: number }>();
  for (const { entry, employeeName } of rows) {
    const entryDate = new Date(`${entry.week_start_date}T00:00:00`);
    const entryMonthKey = `${entryDate.getFullYear()}-${entryDate.getMonth()}`;
    if (entryMonthKey !== currentMonthKey) continue;

    const acc = monthlyTotalsByEmployee.get(entry.employee_id) ?? { employeeName, faturamento: 0, custoOperacional: 0 };
    acc.faturamento += entry.faturamento;
    acc.custoOperacional += entry.custo_operacional;
    monthlyTotalsByEmployee.set(entry.employee_id, acc);
  }

  const custoRanking = [...monthlyTotalsByEmployee.values()]
    .map(({ employeeName, faturamento, custoOperacional }) => ({
      employeeName,
      totalCustoOperacional: custoOperacional,
      custoOperacionalPct: faturamento > 0 ? (custoOperacional / faturamento) * 100 : 0,
    }))
    .sort((a, b) => b.totalCustoOperacional - a.totalCustoOperacional);

  // Lista uma linha por funcionaria (nao por lancamento) — clica no nome e
  // abre a historia completa dela em /financeiro/funcionario/[id], separada
  // por mes. Evita misturar os lancamentos de todo mundo numa lista so.
  const lastEntryByEmployee = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!lastEntryByEmployee.has(row.entry.employee_id)) {
      lastEntryByEmployee.set(row.entry.employee_id, row);
    }
  }
  const employeeList = [...lastEntryByEmployee.entries()]
    .map(([employeeId, row]) => ({ employeeId, employeeName: row.employeeName, lastEntry: row }))
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName, "pt-BR"));

  return (
    <div className="space-y-10">
      <PageHeader
        title="Financeiro"
        description="Faturamento, custo operacional e custo de anúncios da semana — imposto, comissão, variável, saldo e lucro líquido calculados automaticamente."
        action={
          <>
            <CustoRankingButton entries={custoRanking} alertThreshold={CUSTO_OPERACIONAL_ALERT_PCT} monthLabel={monthLabel} />
            <Link
              href="/financeiro/mensal"
              className="rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface"
            >
              📅 Faturamento mensal
            </Link>
            <NewEntryModal employees={employees} rates={{ tax: TAX_RATE, commission: COMMISSION_RATE, variable: VARIABLE_RATE }} />
          </>
        }
      />

      <div>
        <h2 className="mb-4 text-base font-bold text-foreground">Lançamentos por funcionária</h2>
        <div className="space-y-2.5">
          {employeeList.length === 0 && (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted">
              Nenhum lançamento ainda.
            </div>
          )}
          {employeeList.map(({ employeeId, employeeName, lastEntry }) => (
            <Link
              key={employeeId}
              href={`/financeiro/funcionario/${employeeId}`}
              className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:border-primary/40 hover:bg-surface-2"
            >
              <div className="min-w-0">
                <h3 className="font-bold text-foreground">{employeeName}</h3>
                <p className="mt-0.5 text-xs text-muted">
                  Última semana: {formatWeekRange(lastEntry.entry.week_start_date)} ·{" "}
                  <span className="font-semibold text-green-400">{formatCurrency(lastEntry.breakdown.faturamento)}</span>
                </p>
              </div>
              <span className="shrink-0 text-lg text-muted">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
