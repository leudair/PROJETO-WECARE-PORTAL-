"use client";

import { useActionState, useState } from "react";
import { sendNoticeAction } from "./actions";

export function NoticeForm({ employeeId }: { employeeId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(sendNoticeAction, undefined);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-primary underline hover:text-foreground">
        Enviar aviso
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-start gap-2">
      <input type="hidden" name="employeeId" value={employeeId} />
      <textarea
        name="message"
        required
        maxLength={500}
        rows={2}
        placeholder="Mensagem para essa pessoa..."
        className="w-56 rounded-md border border-border px-2 py-1 text-xs"
      />
      <div className="flex flex-col gap-1">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50"
        >
          {pending ? "..." : "Enviar"}
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
