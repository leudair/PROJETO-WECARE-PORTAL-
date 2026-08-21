import { listEmployeesForFinance, listFinancialEntries } from "@/lib/data/finance";
import { EntryForm } from "./entry-form";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

function StatBox({
  label,
  amount,
  variant,
}: {
  label: string;
  amount: number;
  variant: "gain" | "cost" | "auto";
}) {
  const isPositive = variant === "gain" || (variant === "auto" && amount >= 0);
  const colorClass = isPositive ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400";

  return (
    <div className="rounded-lg border border-border bg-background p-2">
      <p className="text-[10px] uppercase text-muted">{label}</p>
      <p className={`font-semibold ${colorClass}`}>{formatCurrency(amount)}</p>
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
                <span className="text-xs text-muted">Semana de {formatDate(entry.week_start_date)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                <StatBox label="Faturamento" amount={breakdown.faturamento} variant="gain" />
                <StatBox label="Custo operacional" amount={breakdown.custoOperacional} variant="cost" />
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
