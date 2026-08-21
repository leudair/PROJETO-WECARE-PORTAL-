"use client";

import { useActionState, useState } from "react";
import { updateEmployeeAction } from "./actions";

export function EditEmployeeButton({
  employeeId,
  fullName,
  email,
  whatsappNumber,
  role,
  canSetElevatedRole,
}: {
  employeeId: string;
  fullName: string;
  email: string;
  whatsappNumber: string;
  role: string;
  canSetElevatedRole: boolean;
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
    <form action={formAction} className="w-56 space-y-2 rounded-md border border-border bg-surface-2 p-2">
      <input type="hidden" name="employeeId" value={employeeId} />

      <div className="space-y-0.5">
        <label className="text-[10px] uppercase text-muted">Nome</label>
        <input
          name="fullName"
          defaultValue={fullName}
          required
          className="w-full rounded-md border border-border px-2 py-1 text-xs"
        />
      </div>

      <div className="space-y-0.5">
        <label className="text-[10px] uppercase text-muted">Email</label>
        <input
          type="email"
          name="email"
          defaultValue={email}
          required
          className="w-full rounded-md border border-border px-2 py-1 text-xs"
        />
      </div>

      <div className="space-y-0.5">
        <label className="text-[10px] uppercase text-muted">WhatsApp</label>
        <input
          name="whatsappNumber"
          defaultValue={whatsappNumber}
          required
          className="w-full rounded-md border border-border px-2 py-1 text-xs"
        />
      </div>

      <div className="space-y-0.5">
        <label className="text-[10px] uppercase text-muted">Papel</label>
        <select
          name="role"
          defaultValue={role}
          className="w-full rounded-md border border-border px-2 py-1 text-xs"
        >
          <option value="employee">Funcionário</option>
          {canSetElevatedRole && <option value="manager">Gerente</option>}
          {canSetElevatedRole && <option value="financeiro">Financeiro</option>}
        </select>
      </div>

      <div className="space-y-0.5">
        <label className="text-[10px] uppercase text-muted">Nova senha (opcional)</label>
        <input
          type="text"
          name="password"
          placeholder="Deixe em branco pra manter"
          minLength={8}
          className="w-full rounded-md border border-border px-2 py-1 text-xs"
        />
      </div>

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
      {state?.success && <p className="text-xs text-green-600">{state.success}</p>}
    </form>
  );
}
