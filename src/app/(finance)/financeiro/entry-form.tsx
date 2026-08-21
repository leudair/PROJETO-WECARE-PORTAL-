"use client";

import { useActionState } from "react";
import { saveFinancialEntryAction } from "./actions";

function lastMonday(): string {
  const d = new Date();
  const day = d.getDay(); // 0=domingo
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

export function EntryForm({ employees }: { employees: { id: string; full_name: string }[] }) {
  const [state, formAction, pending] = useActionState(saveFinancialEntryAction, undefined);

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
          <label className="text-xs font-medium text-foreground">Semana (segunda-feira)</label>
          <input
            type="date"
            name="weekStartDate"
            required
            defaultValue={lastMonday()}
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
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
