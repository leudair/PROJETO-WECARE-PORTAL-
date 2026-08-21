"use client";

import { useActionState, useState } from "react";
import { updatePurchaseValueAction, type UpdatePurchaseValueState } from "./actions";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PurchaseValue({ contactId, value }: { contactId: string; value: number | null }) {
  const [open, setOpen] = useState(false);
  const action = updatePurchaseValueAction.bind(null, contactId);
  const [state, formAction, pending] = useActionState<UpdatePurchaseValueState, FormData>(action, undefined);

  if (open) {
    return (
      <form action={formAction} className="space-y-1">
        <input
          type="number"
          name="value"
          step="0.01"
          min="0"
          defaultValue={value ?? 0}
          required
          className="w-full rounded-md border border-border px-1.5 py-1 text-xs"
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-primary px-2 py-0.5 text-xs text-primary-foreground disabled:opacity-50"
          >
            {pending ? "..." : "Salvar"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted hover:text-foreground">
            Cancelar
          </button>
        </div>
        {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      </form>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {value != null ? (
        <span className="font-semibold text-green-700 dark:text-green-400">{formatCurrency(value)}</span>
      ) : (
        <span className="text-muted">—</span>
      )}
      <button type="button" onClick={() => setOpen(true)} className="text-[10px] text-primary hover:underline">
        editar
      </button>
    </span>
  );
}
