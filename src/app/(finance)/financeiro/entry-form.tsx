"use client";

import { useActionState, useState } from "react";
import { saveFinancialEntryAction } from "./actions";
import { EmployeeSelect } from "./employee-select";

// Datas de entrada/saida do periodo sao livres (calendario nativo do
// navegador) — antes eram travadas num dropdown de "semana" pra evitar erro
// de calculo, mas isso limitava demais. O padrao inicial continua sendo a
// ultima segunda a sabado, so que agora da pra ajustar livremente.
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

function defaultStartEnd(): { start: string; end: string } {
  const monday = mondayOfCurrentWeek();
  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);
  return { start: toDateInputValue(monday), end: toDateInputValue(saturday) };
}

export function EntryForm({ employees }: { employees: { id: string; full_name: string }[] }) {
  const [state, formAction, pending] = useActionState(saveFinancialEntryAction, undefined);
  const [defaults] = useState(defaultStartEnd);
  const [startDate, setStartDate] = useState(defaults.start);

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border bg-surface p-6">
      <h2 className="text-sm font-semibold text-foreground">Novo lançamento</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Funcionário</label>
          <EmployeeSelect employees={employees} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Data de entrada</label>
            <input
              type="date"
              name="weekStartDate"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Data de saída</label>
            <input
              type="date"
              name="weekEndDate"
              required
              min={startDate}
              defaultValue={defaults.end}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
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
