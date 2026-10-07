"use client";

import { useActionState, useMemo } from "react";
import { saveMonthlyRevenueEntryAction } from "./actions";
import { EmployeeSelect } from "../employee-select";

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

function toDateInputValue(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function firstDayOfCurrentMonth(): Date {
  const d = new Date();
  d.setDate(1);
  return d;
}

const MONTHS_BACK = 5;

function buildMonthOptions(): { value: string; label: string }[] {
  const currentMonth = firstDayOfCurrentMonth();

  const options = [];
  for (let i = 0; i >= -MONTHS_BACK; i--) {
    const month = new Date(currentMonth);
    month.setMonth(currentMonth.getMonth() + i);
    const label = `${MONTH_NAMES[month.getMonth()]} ${month.getFullYear()}`;
    const tag = i === 0 ? " (mês atual)" : "";
    options.push({ value: toDateInputValue(month), label: `${label}${tag}` });
  }
  return options;
}

export function EntryForm({ employees }: { employees: { id: string; full_name: string }[] }) {
  const [state, formAction, pending] = useActionState(saveMonthlyRevenueEntryAction, undefined);
  const monthOptions = useMemo(() => buildMonthOptions(), []);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border bg-surface p-6">
      <h2 className="text-sm font-semibold text-foreground">Lançamento mensal</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Funcionário</label>
          <EmployeeSelect employees={employees} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Mês</label>
          <select
            name="monthStartDate"
            required
            defaultValue={monthOptions[0]?.value}
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          >
            {monthOptions.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Faturamento do mês (R$)</label>
        <input
          type="number"
          name="faturamento"
          required
          min="0"
          step="0.01"
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Salvar lançamento"}
      </button>
    </form>
  );
}
