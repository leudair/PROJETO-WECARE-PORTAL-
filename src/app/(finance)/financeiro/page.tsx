import { CUSTO_OPERACIONAL_ALERT_PCT, listEmployeesForFinance, listFinancialEntries } from "@/lib/data/finance";
import { EntryForm } from "./entry-form";
import { EditEntryButton } from "./edit-entry-button";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// entry.week_start_date e' sempre uma segunda-feira (ver lastMonday() no
// formulario) — a semana de trabalho vai de segunda a sabado, entao o fim
// e' sempre inicio + 5 dias.
function formatWeekRange(weekStartIso: string) {
  const start = new Date(`${weekStartIso}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 5);
  return `${start.toLocaleDateString("pt-BR")} a ${end.toLocaleDateString("pt-BR")}`;
}

function StatBox({
  label,
  amount,
  variant,
  subLabel,
  alert,
}: {
  label: string;
  amount: number;
  variant: "gain" | "cost" | "auto";
  subLabel?: string;
  alert?: boolean;
}) {
  const isPositive = variant === "gain" || (variant === "auto" && amount >= 0);
  const colorClass = isPositive ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400";

  return (
    <div
      className={
        alert
          ? "rounded-lg border-2 border-red-400 bg-red-50 p-2 dark:border-red-800 dark:bg-red-950/30"
          : "rounded-lg border border-border bg-background p-2"
      }
    >
      <p className="text-[10px] uppercase text-muted">{label}</p>
      <p className={`font-semibold ${colorClass}`}>{formatCurrency(amount)}</p>
      {subLabel && (
        <p
          className={
            alert
              ? "text-[10px] font-semibold text-red-700 dark:text-red-400"
              : "text-[10px] text-muted"
          }
        >
          {alert && "🔔 "}
          {subLabel}
        </p>
      )}
    </div>
  );
}

export default async function FinanceiroPage() {
  const [employees, rows] = await Promise.all([listEmployeesForFinance(), listFinancialEntries()]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted">
          Informe faturamento, custo operacional e custo de anúncios da semana — imposto, comissão,
          variável, saldo e lucro líquido são calculados automaticamente.
        </p>
      </div>

      <EntryForm employees={employees} />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Lançamentos</h2>
        <div className="space-y-3">
          {rows.length === 0 && (
            <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
              Nenhum lançamento ainda.
            </div>
          )}
          {rows.map(({ entry, employeeName, breakdown }) => (
            <div key={entry.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-1">
                <h3 className="font-semibold text-foreground">{employeeName}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">Semana de {formatWeekRange(entry.week_start_date)}</span>
                  <EditEntryButton
                    employeeId={entry.employee_id}
                    weekStartDate={entry.week_start_date}
                    faturamento={entry.faturamento}
                    custoOperacional={entry.custo_operacional}
                    custoAnuncios={entry.custo_anuncios}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                <StatBox label="Faturamento" amount={breakdown.faturamento} variant="gain" />
                <StatBox
                  label="Custo operacional"
                  amount={breakdown.custoOperacional}
                  variant="cost"
                  subLabel={`${breakdown.custoOperacionalPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% do faturamento`}
                  alert={breakdown.custoOperacionalPct > CUSTO_OPERACIONAL_ALERT_PCT}
                />
                <StatBox label="Imposto (15%)" amount={breakdown.imposto} variant="cost" />
                <StatBox label="Comissão (2,5%)" amount={breakdown.comissao} variant="cost" />
                <StatBox label="Variável (4,5%)" amount={breakdown.variavel} variant="cost" />
                <StatBox label="Saldo da operação" amount={breakdown.saldoOperacao} variant="auto" />
                <StatBox label="Custo anúncios" amount={breakdown.custoAnuncios} variant="cost" />
                <StatBox label="Lucro líquido" amount={breakdown.lucroLiquido} variant="auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
