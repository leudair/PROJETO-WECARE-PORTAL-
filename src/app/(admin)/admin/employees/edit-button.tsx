"use client";

import { useActionState, useState } from "react";
import { updateEmployeeAction } from "./actions";

export function EditEmployeeButton({
  employeeId,
  fullName,
  whatsappNumber,
}: {
  employeeId: string;
  fullName: string;
  whatsappNumber: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateEmployeeAction, undefined);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-primary hover:underline">
        Editar
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="employeeId" value={employeeId} />
      <input
        name="fullName"
        defaultValue={fullName}
        required
        className="w-40 rounded-md border border-border px-2 py-1 text-xs"
      />
      <input
        name="whatsappNumber"
        defaultValue={whatsappNumber}
        required
        className="w-40 rounded-md border border-border px-2 py-1 text-xs"
      />
      <div className="flex gap-2">
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
      </div>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
