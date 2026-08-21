import { listEmployeesForFinance, listFinancialEntries } from "@/lib/data/finance";
import { EntryForm } from "./entry-form";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
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
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-background text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Funcionário</th>
                <th className="px-4 py-2">Semana</th>
                <th className="px-4 py-2">Faturamento</th>
                <th className="px-4 py-2">Custo operacional</th>
                <th className="px-4 py-2">Imposto (15%)</th>
                <th className="px-4 py-2">Comissão (2,5%)</th>
                <th className="px-4 py-2">Variável (4,5%)</th>
                <th className="px-4 py-2">Saldo da operação</th>
                <th className="px-4 py-2">Custo anúncios</th>
                <th className="px-4 py-2">Lucro líquido</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-center text-muted">
                    Nenhum lançamento ainda.
                  </td>
                </tr>
              )}
              {rows.map(({ entry, employeeName, breakdown }) => (
                <tr key={entry.id} className="border-t border-border">
                  <td className="px-4 py-2">{employeeName}</td>
                  <td className="px-4 py-2 text-muted">{formatDate(entry.week_start_date)}</td>
                  <td className="px-4 py-2">{formatCurrency(breakdown.faturamento)}</td>
                  <td className="px-4 py-2 text-muted">{formatCurrency(breakdown.custoOperacional)}</td>
                  <td className="px-4 py-2 text-muted">{formatCurrency(breakdown.imposto)}</td>
                  <td className="px-4 py-2 text-muted">{formatCurrency(breakdown.comissao)}</td>
                  <td className="px-4 py-2 text-muted">{formatCurrency(breakdown.variavel)}</td>
                  <td className="px-4 py-2">{formatCurrency(breakdown.saldoOperacao)}</td>
                  <td className="px-4 py-2 text-muted">{formatCurrency(breakdown.custoAnuncios)}</td>
                  <td className="px-4 py-2 font-semibold text-foreground">
                    {formatCurrency(breakdown.lucroLiquido)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
