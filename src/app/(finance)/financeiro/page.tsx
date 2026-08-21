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
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-2">
      <p className="text-[10px] uppercase text-muted">{label}</p>
      <p className={emphasize ? "font-semibold text-foreground" : "text-foreground"}>{value}</p>
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
                <StatBox label="Faturamento" value={formatCurrency(breakdown.faturamento)} />
                <StatBox label="Custo operacional" value={formatCurrency(breakdown.custoOperacional)} />
                <StatBox label="Imposto (15%)" value={formatCurrency(breakdown.imposto)} />
                <StatBox label="Comissão (2,5%)" value={formatCurrency(breakdown.comissao)} />
                <StatBox label="Variável (4,5%)" value={formatCurrency(breakdown.variavel)} />
                <StatBox label="Saldo da operação" value={formatCurrency(breakdown.saldoOperacao)} emphasize />
                <StatBox label="Custo anúncios" value={formatCurrency(breakdown.custoAnuncios)} />
                <StatBox label="Lucro líquido" value={formatCurrency(breakdown.lucroLiquido)} emphasize />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
