function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const MONTH_FULL = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

// Meta que o admin estipula pra funcionaria (profiles.monthly_goal) vs o que
// ela mesma ja marcou como vendido esse mes (mesma fonte do grafico "Minhas
// vendas" — ver getOwnSalesHistory). Sem meta definida, nao mostra nada: um
// 0% constante so deixaria a funcionaria desmotivada a toa.
export function MonthlyGoal({ monthToDateTotal, goal }: { monthToDateTotal: number; goal: number | null }) {
  if (!goal) return null;

  const pct = Math.min(100, Math.round((monthToDateTotal / goal) * 100));
  const monthLabel = MONTH_FULL[new Date().getMonth()];

  return (
    <div className="card-glass p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-foreground">Meta de {monthLabel}</h2>
          <p className="mt-0.5 text-xs text-muted">
            {formatCurrency(monthToDateTotal)} de {formatCurrency(goal)}
          </p>
        </div>
        <span className="text-2xl font-bold tabular-nums text-foreground [text-shadow:0_0_24px_rgba(232,69,94,0.35)]">
          {pct}%
        </span>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-background">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#f06478] to-[#b0102f] transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
