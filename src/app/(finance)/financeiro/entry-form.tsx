"use client";

import { useActionState, useMemo } from "react";
import { saveFinancialEntryAction } from "./actions";

// evita digitar/escolher uma data que nao seja segunda-feira (foi o que
// gerou confusao antes: dava pra selecionar qualquer dia no calendario e o
// "periodo" calculado ficava errado). Em vez de um <input type="date">
// livre, o financeiro escolhe entre as ultimas semanas + a semana atual,
// ja com o intervalo completo (segunda a sabado) escrito no rotulo — o
// faturamento e' sempre lancado no sabado, entao a "semana atual" ja vem
// selecionada por padrao.
function toDateInputValue(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mondayOfCurrentWeek(): Date {
  const d = new Date();
  const day = d.getDay(); // 0=domingo
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

const WEEKS_BACK = 3;

function buildWeekOptions(): { value: string; label: string }[] {
  const currentMonday = mondayOfCurrentWeek();

  const options = [];
  for (let i = 0; i >= -WEEKS_BACK; i--) {
    const monday = new Date(currentMonday);
    monday.setDate(currentMonday.getDate() + i * 7);
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    const range = `${monday.toLocaleDateString("pt-BR")} a ${saturday.toLocaleDateString("pt-BR")}`;
    const tag = i === 0 ? " (semana atual)" : i === -1 ? " (semana passada)" : "";
    options.push({ value: toDateInputValue(monday), label: `${range}${tag}` });
  }
  return options;
}

export function EntryForm({ employees }: { employees: { id: string; full_name: string }[] }) {
  const [state, formAction, pending] = useActionState(saveFinancialEntryAction, undefined);
  const weekOptions = useMemo(() => buildWeekOptions(), []);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border bg-surface p-6">
      <h2 className="text-sm font-semibold text-foreground">Lançamento semanal</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Funcionário</label>
          <select
            name="employeeId"
            required
            defaultValue=""
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Selecione
            </option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Semana</label>
          <select
            name="weekStartDate"
            required
            defaultValue={weekOptions[0]?.value}
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          >
            {weekOptions.map((week) => (
              <option key={week.value} value={week.value}>
                {week.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Faturamento (R$)</label>
          <input
            type="number"
            name="faturamento"
            required
            min="0"
            step="0.01"
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Custo operacional/mercadoria (R$)</label>
          <input
            type="number"
            name="custoOperacional"
            required
            min="0"
            step="0.01"
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Custo de anúncios/tráfego (R$)</label>
          <input
            type="number"
            name="custoAnuncios"
            required
            min="0"
            step="0.01"
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
        </div>
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
