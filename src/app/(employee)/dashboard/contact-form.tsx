"use client";

import { useActionState, useEffect, useState } from "react";
import { addContact } from "./actions";

const STAGES = [2, 3, 4, 5, 6];

const inputClass =
  "w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary";

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function ContactForm({ onSaved }: { onSaved?: () => void }) {
  const [state, formAction, pending] = useActionState(addContact, undefined);
  const [contactType, setContactType] = useState<"cliente" | "lead">("cliente");
  const [nextContactDate, setNextContactDate] = useState(todayPlus(5));

  useEffect(() => {
    if (state?.success) onSaved?.();
  }, [state?.success, onSaved]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">Nome do cliente</label>
          <input name="name" required className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-foreground">@ do perfil (opcional)</label>
          <input name="instagramHandle" placeholder="usuario" className={inputClass} />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Telefone (com código do país)</label>
        <input name="phone" required placeholder="+5511999999999" className={inputClass} />
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
              className={`w-32 ${inputClass}`}
            />
          </div>
          <p className="text-xs text-muted">Ajuda a decidir um pacote maior na hora de reengajar.</p>
        </div>
      )}

      {contactType === "lead" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Qual tentativa é essa?</label>
            <select name="attemptStage" required defaultValue="" className={inputClass}>
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
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Valor de interesse (se manifestado)</label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted">R$</span>
              <input
                type="number"
                name="leadInterestValue"
                min="0"
                step="0.01"
                placeholder="50,00 (padrão)"
                className={`w-32 ${inputClass}`}
              />
            </div>
            <p className="text-xs text-muted">Se o lead não citou valor, deixe em branco (assume R$ 50).</p>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <label className="text-xs font-medium text-foreground">Entrar em contato em</label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            name="nextContactDate"
            value={nextContactDate}
            onChange={(e) => setNextContactDate(e.target.value)}
            required
            className={`w-auto ${inputClass}`}
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

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="btn-glossy w-full rounded-lg px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50 sm:w-auto"
      >
        {pending ? "Salvando..." : "Salvar lembrete"}
      </button>
    </form>
  );
}
