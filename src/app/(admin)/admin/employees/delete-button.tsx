"use client";

import { useActionState } from "react";
import { deleteEmployeeAction } from "./actions";

export function DeleteEmployeeButton({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const [state, formAction, pending] = useActionState(deleteEmployeeAction.bind(null, employeeId), undefined);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        const ok = confirm(
          `Excluir "${employeeName}"? Isso também apaga todos os clientes/leads cadastrados por essa pessoa. Não pode ser desfeito.`
        );
        if (!ok) e.preventDefault();
      }}
    >
      <button type="submit" disabled={pending} className="text-xs text-red-600 hover:underline disabled:opacity-50">
        {pending ? "Excluindo..." : "Excluir"}
      </button>
      {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
