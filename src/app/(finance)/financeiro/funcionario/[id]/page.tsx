import Link from "next/link";
import { notFound } from "next/navigation";
import { CUSTO_OPERACIONAL_ALERT_PCT, getEmployeeFinancialHistory } from "@/lib/data/finance";
import { MonthlyBreakdown } from "./monthly-breakdown";

export default async function FuncionarioFinanceiroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let data;
  try {
    data = await getEmployeeFinancialHistory(id);
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/financeiro" className="text-xs text-muted hover:text-foreground">
          ← Voltar ao financeiro
        </Link>
        <h1 className="mt-1 text-lg font-semibold text-foreground">{data.employeeName}</h1>
        <p className="text-sm text-muted">Escolha o mês pra ver as semanas lançadas.</p>
      </div>

      <MonthlyBreakdown entries={data.entries} alertThreshold={CUSTO_OPERACIONAL_ALERT_PCT} />
    </div>
  );
}
