"use client";

import { useActionState, useState } from "react";
import { markConvertedAction, type MarkConvertedState } from "./actions";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ConvertLeadButton({
  contactId,
  suggestedValue,
}: {
  contactId: string;
  suggestedValue: number;
}) {
  const [open, setOpen] = useState(false);
  const action = markConvertedAction.bind(null, contactId);
  const [state, formAction, pending] = useActionState<MarkConvertedState, FormData>(action, undefined);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-border px-2 py-1.5 text-xs text-muted hover:bg-surface-2"
      >
        Marcar como convertido
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <div className="flex-1 space-y-0.5">
          <label className="text-[10px] uppercase text-muted">Valor da venda</label>
          <input
            type="number"
            name="saleValue"
            step="0.01"
            min="0"
            defaultValue={suggestedValue}
            required
            className="w-full rounded-md border border-border px-1.5 py-1 text-xs"
          />
        </div>
        <div className="flex-1 space-y-0.5">
          <label className="text-[10px] uppercase text-muted">Data da venda</label>
          <input
            type="date"
            name="saleDate"
            defaultValue={today()}
            required
            className="w-full rounded-md border border-border px-1.5 py-1 text-xs"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50"
        >
          {pending ? "..." : "Confirmar"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted hover:text-foreground">
          Cancelar
        </button>
      </div>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
