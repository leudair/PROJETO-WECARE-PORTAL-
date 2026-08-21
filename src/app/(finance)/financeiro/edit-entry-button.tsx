"use client";

import { useActionState, useState } from "react";
import { saveFinancialEntryAction } from "./actions";

export function EditEntryButton({
  employeeId,
  weekStartDate,
  faturamento,
  custoOperacional,
  custoAnuncios,
}: {
  employeeId: string;
  weekStartDate: string;
  faturamento: number;
  custoOperacional: number;
  custoAnuncios: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(saveFinancialEntryAction, undefined);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-primary hover:underline">
        Editar
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-3 space-y-2 rounded-md border border-border bg-background p-3">
      <input type="hidden" name="employeeId" value={employeeId} />
      <input type="hidden" name="weekStartDate" value={weekStartDate} />

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-0.5">
          <label className="text-[10px] uppercase text-muted">Faturamento (R$)</label>
          <input
            type="number"
            name="faturamento"
            defaultValue={faturamento}
            required
            min="0"
            step="0.01"
            className="w-full rounded-md border border-border px-2 py-1 text-xs"
          />
        </div>
        <div className="space-y-0.5">
          <label className="text-[10px] uppercase text-muted">Custo operacional</label>
          <input
            type="number"
            name="custoOperacional"
            defaultValue={custoOperacional}
            required
            min="0"
            step="0.01"
            className="w-full rounded-md border border-border px-2 py-1 text-xs"
          />
        </div>
        <div className="space-y-0.5">
          <label className="text-[10px] uppercase text-muted">Custo anúncios</label>
          <input
            type="number"
            name="custoAnuncios"
            defaultValue={custoAnuncios}
            required
            min="0"
            step="0.01"
            className="w-full rounded-md border border-border px-2 py-1 text-xs"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50"
        >
          {pending ? "..." : "Salvar"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted hover:text-foreground">
          Cancelar
        </button>
        {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
        {state?.success && <p className="text-xs text-green-600">{state.success}</p>}
      </div>
    </form>
  );
}
