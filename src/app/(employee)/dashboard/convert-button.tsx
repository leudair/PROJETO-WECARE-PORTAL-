"use client";

import { useActionState, useState } from "react";
import { markConvertedAction, type MarkConvertedState } from "./actions";

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
        className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-surface-2"
      >
        Marcar como convertido
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-1">
      <input
        type="number"
        name="saleValue"
        step="0.01"
        min="0"
        defaultValue={suggestedValue}
        required
        className="w-20 rounded-md border border-border px-1.5 py-1 text-xs"
      />
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
      {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
