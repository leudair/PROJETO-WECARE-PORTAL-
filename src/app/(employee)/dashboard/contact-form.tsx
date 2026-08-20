"use client";

import { useActionState, useState } from "react";
import { addContact } from "./actions";

const STAGES = [2, 3, 4, 5, 6];

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function ContactForm() {
  const [state, formAction, pending] = useActionState(addContact, undefined);
  const [contactType, setContactType] = useState<"cliente" | "lead">("cliente");
  const [nextContactDate, setNextContactDate] = useState(todayPlus(5));

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border bg-surface p-6">
      <h2 className="text-sm font-semibold text-foreground">Novo lembrete de contato</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Nome do cliente</label>
          <input
            name="name"
            required
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">@ do perfil (opcional)</label>
          <input
            name="instagramHandle"
            placeholder="usuario"
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Telefone (com código do país)</label>
        <input
          name="phone"
          required
          placeholder="+5511999999999"
          className="w-full rounded-md border border-border px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Tipo</label>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="contactType"
              value="cliente"
              checked={contactType === "cliente"}
              onChange={() => setContactType("cliente")}
            />
            Cliente (já comprou)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="contactType"
              value="lead"
              checked={contactType === "lead"}
              onChange={() => setContactType("lead")}
            />
            Lead (ainda não comprou)
          </label>
        </div>
      </div>

      {contactType === "cliente" && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Valor da última compra (opcional)</label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted">R$</span>
            <input
              type="number"
              name="lastPurchaseValue"
              min="0"
              step="0.01"
              placeholder="0,00"
              className="w-32 rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
          <p className="text-xs text-muted">Ajuda a decidir um pacote maior na hora de reengajar.</p>
        </div>
      )}

      {contactType === "lead" && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Qual tentativa é essa?</label>
          <select
            name="attemptStage"
            required
            defaultValue=""
            className="w-full rounded-md border border-border px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Selecione
            </option>
            {STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stage}ª tentativa
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Entrar em contato em</label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            name="nextContactDate"
            value={nextContactDate}
            onChange={(e) => setNextContactDate(e.target.value)}
            required
            className="rounded-md border border-border px-3 py-2 text-sm"
          />
          <div className="flex gap-1 text-xs">
            {[5, 15, 30].map((days) => (
              <button
                type="button"
                key={days}
                onClick={() => setNextContactDate(todayPlus(days))}
                className="rounded-md border border-border px-2 py-1 text-muted hover:bg-surface-2"
              >
                +{days}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Salvar lembrete"}
      </button>
    </form>
  );
}
