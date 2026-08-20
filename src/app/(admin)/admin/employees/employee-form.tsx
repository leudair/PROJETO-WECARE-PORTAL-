"use client";

import { useActionState, useState } from "react";
import { createEmployeeAction } from "./actions";

function randomPassword() {
  return Math.random().toString(36).slice(-10) + "A1!";
}

export function EmployeeForm({ canCreateManager }: { canCreateManager: boolean }) {
  const [state, formAction, pending] = useActionState(createEmployeeAction, undefined);
  // Vazio por padrao (SSR e client tem que renderizar o mesmo valor); o admin
  // clica em "Gerar" para preencher uma senha aleatoria so no client.
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border bg-surface p-6">
      <h2 className="text-sm font-semibold text-foreground">Novo acesso</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Nome</label>
          <input name="fullName" required className="w-full rounded-md border border-border px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Email de acesso</label>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Tipo de acesso</label>
        <select
          name="role"
          defaultValue="employee"
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
        >
          <option value="employee">Funcionário</option>
          {canCreateManager && <option value="manager">Gerente</option>}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">WhatsApp do funcionário</label>
          <input
            name="whatsappNumber"
            required
            placeholder="+5511999999999"
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
          <p className="text-xs text-muted">Número que vai receber os lembretes.</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Senha temporária</label>
          <div className="flex gap-2">
            <input
              name="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setPassword(randomPassword())}
              className="rounded-md border border-border px-2 text-xs text-muted hover:bg-surface-2"
            >
              Gerar
            </button>
          </div>
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {pending ? "Criando..." : "Criar acesso"}
      </button>
    </form>
  );
}
