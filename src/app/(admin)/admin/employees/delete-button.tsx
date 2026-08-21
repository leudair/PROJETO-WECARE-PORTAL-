"use client";

import { useActionState, useState, useTransition } from "react";
import { deleteEmployeeAction, getDeletionImpactAction } from "./actions";

type Impact = { contactsCount: number; financialEntriesCount: number };

export function DeleteEmployeeButton({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const [impact, setImpact] = useState<Impact | null>(null);
  const [loadingImpact, startLoadingImpact] = useTransition();
  const [typedName, setTypedName] = useState("");
  const [state, formAction, pending] = useActionState(deleteEmployeeAction.bind(null, employeeId), undefined);

  if (!impact) {
    return (
      <button
        type="button"
        disabled={loadingImpact}
        onClick={() => {
          startLoadingImpact(async () => {
            const result = await getDeletionImpactAction(employeeId);
            setImpact(result);
          });
        }}
        className="text-xs text-red-600 hover:underline disabled:opacity-50"
      >
        {loadingImpact ? "Verificando..." : "Excluir"}
      </button>
    );
  }

  const hasData = impact.contactsCount > 0 || impact.financialEntriesCount > 0;
  const confirmed = typedName.trim().toLowerCase() === employeeName.trim().toLowerCase();

  return (
    <div className="w-56 rounded-md border border-red-300 bg-red-50 p-2 text-xs dark:border-red-900 dark:bg-red-950/30">
      <p className="font-semibold text-red-700 dark:text-red-400">Excluir &quot;{employeeName}&quot;?</p>
      {hasData ? (
        <p className="mt-1 text-red-700 dark:text-red-400">
          Essa conta tem <strong>{impact.contactsCount}</strong> cliente(s)/lead(s) e{" "}
          <strong>{impact.financialEntriesCount}</strong> lançamento(s) financeiro(s). Tudo isso será apagado
          permanentemente junto com a conta.
        </p>
      ) : (
        <p className="mt-1 text-muted">Essa conta ainda não tem dados cadastrados.</p>
      )}
      <label className="mt-2 block text-muted">
        Digite <strong>{employeeName}</strong> pra confirmar:
      </label>
      <input
        value={typedName}
        onChange={(e) => setTypedName(e.target.value)}
        className="mt-1 w-full rounded-md border border-border px-2 py-1 text-xs"
      />
      <form action={formAction} className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={!confirmed || pending}
          className="rounded-md bg-red-600 px-2 py-1 text-xs text-white disabled:opacity-40"
        >
          {pending ? "Excluindo..." : "Confirmar exclusão"}
        </button>
        <button
          type="button"
          onClick={() => {
            setImpact(null);
            setTypedName("");
          }}
          className="text-xs text-muted hover:text-foreground"
        >
          Cancelar
        </button>
      </form>
      {state?.error && <p className="mt-1 text-red-700 dark:text-red-400">{state.error}</p>}
    </div>
  );
}
