"use client";

import { useMemo, useState } from "react";
import type { FinancialBreakdown } from "@/lib/data/finance";
import { EditEntryButton } from "../../edit-entry-button";
import { formatCurrency, formatWeekRange, MONTH_NAMES } from "../../format";

interface EntryRow {
  entry: {
    id: string;
    employee_id: string;
    week_start_date: string;
    faturamento: number;
    custo_operacional: number;
    custo_anuncios: number;
  };
  breakdown: FinancialBreakdown;
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
    <div className="rounded-lg border border-border bg-background p-2">
      <p className="text-[10px] uppercase text-muted">{label}</p>
      <p className={`font-semibold ${colorClass}`}>{formatCurrency(amount)}</p>
      {subLabel && (
        <p className={alert ? "text-[10px] font-semibold text-red-700 dark:text-red-400" : "text-[10px] text-muted"}>
          {subLabel}
        </p>
      )}
    </div>
  );
}

// Entra na pagina da funcionaria, escolhe um mes (ano + Jan..Dez) e ve so as
// semanas lancadas naquele mes — em vez da lista corrida de todas as semanas,
// que ficava dificil de achar um periodo especifico.
export function MonthlyBreakdown({ entries, alertThreshold }: { entries: EntryRow[]; alertThreshold: number }) {
  const mostRecent = entries[0];
  const defaultDate = mostRecent ? new Date(`${mostRecent.entry.week_start_date}T00:00:00`) : new Date();

  const [selectedYear, setSelectedYear] = useState(defaultDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(defaultDate.getMonth());

  const years = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()]);
    for (const { entry } of entries) {
      set.add(new Date(`${entry.week_start_date}T00:00:00`).getFullYear());
    }
    return [...set].sort((a, b) => b - a);
  }, [entries]);

  const monthsWithData = useMemo(() => {
    const set = new Set<string>();
    for (const { entry } of entries) {
      const d = new Date(`${entry.week_start_date}T00:00:00`);
      set.add(`${d.getFullYear()}-${d.getMonth()}`);
    }
    return set;
  }, [entries]);

  const entriesInMonth = useMemo(
    () =>
      entries.filter(({ entry }) => {
        const d = new Date(`${entry.week_start_date}T00:00:00`);
        return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
      }),
    [entries, selectedYear, selectedMonth]
  );

  return (
    <div className="space-y-4">
      {years.length > 1 && (
        <div className="flex gap-2">
          {years.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => setSelectedYear(year)}
              className={
                year === selectedYear
                  ? "rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                  : "rounded-md border border-border px-3 py-1 text-xs text-muted hover:text-foreground"
              }
            >
              {year}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {MONTH_NAMES.map((name, i) => {
          const hasData = monthsWithData.has(`${selectedYear}-${i}`);
          const isActive = i === selectedMonth;
          return (
            <button
              key={name}
              type="button"
              onClick={() => setSelectedMonth(i)}
              className={
                isActive
                  ? "shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                  : hasData
                    ? "shrink-0 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-background"
                    : "shrink-0 rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground"
              }
            >
              {name}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {entriesInMonth.length === 0 && (
          <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
            Nenhum lançamento em {MONTH_NAMES[selectedMonth]} de {selectedYear}.
          </div>
        )}
        {entriesInMonth.map(({ entry, breakdown }) => (
          <div key={entry.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-1">
              <span className="text-xs text-muted">Semana de {formatWeekRange(entry.week_start_date)}</span>
              <EditEntryButton
                employeeId={entry.employee_id}
                weekStartDate={entry.week_start_date}
                faturamento={entry.faturamento}
                custoOperacional={entry.custo_operacional}
                custoAnuncios={entry.custo_anuncios}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              <StatBox label="Faturamento" amount={breakdown.faturamento} variant="gain" />
              <StatBox
                label="Custo operacional"
                amount={breakdown.custoOperacional}
                variant="cost"
                subLabel={`${breakdown.custoOperacionalPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% do faturamento`}
                alert={breakdown.custoOperacionalPct > alertThreshold}
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
  );
}
