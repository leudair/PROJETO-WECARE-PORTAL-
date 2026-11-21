"use client";

import { useActionState } from "react";
import type { AssinaturaState } from "@/lib/actions/assinatura";

type Action = (state: AssinaturaState, formData: FormData) => Promise<AssinaturaState>;

// Campo de codigo + botao de assinar. Usado para abrir o dia, fechar o dia e
// para a gerente assinar o relatorio de uma vendedora.
export function AssinaturaForm({
  action,
  botao,
  hidden,
  observacao,
  compacto,
}: {
  action: Action;
  botao: string;
  hidden?: Record<string, string>;
  observacao?: string;
  compacto?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  if (state?.success) {
    return <p className="text-sm font-medium text-green-400">{state.success}</p>;
  }

  return (
    <form action={formAction} className={compacto ? "space-y-2" : "space-y-3"}>
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {observacao !== undefined && (
        <textarea
          name="observacao"
          rows={compacto ? 2 : 3}
          maxLength={2000}
          placeholder={observacao}
          className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground"
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="codigo"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          pattern="\d{4,8}"
          required
          placeholder="Seu código"
          className="w-36 rounded-full border border-border bg-surface-2 px-4 py-2 text-center text-sm tracking-[0.3em] text-foreground placeholder:tracking-normal"
        />
        <button type="submit" disabled={pending} className="btn-vidro btn-vidro-ativo disabled:opacity-50">
          {pending ? "Conferindo..." : botao}
        </button>
      </div>
      {state?.error && <p className="text-xs text-red-400">{state.error}</p>}
    </form>
  );
}

export function CriarCodigoForm({ action, trocar }: { action: Action; trocar?: boolean }) {
  const [state, formAction, pending] = useActionState(action, undefined);

  if (state?.success) {
    return <p className="text-sm font-medium text-green-400">{state.success}</p>;
  }

  const campo =
    "w-full rounded-full border border-border bg-surface-2 px-4 py-2 text-center text-sm tracking-[0.3em] text-foreground placeholder:tracking-normal";

  return (
    <form action={formAction} className="mx-auto max-w-xs space-y-3">
      {trocar && (
        <input name="atual" type="password" inputMode="numeric" required placeholder="Código atual" className={campo} />
      )}
      <input
        name="novo"
        type="password"
        inputMode="numeric"
        pattern="\d{4,8}"
        required
        placeholder="Novo código (4 a 8 números)"
        className={campo}
      />
      <input name="confirmar" type="password" inputMode="numeric" required placeholder="Repita o código" className={campo} />
      <button type="submit" disabled={pending} className="btn-vidro btn-vidro-ativo w-full disabled:opacity-50">
        {pending ? "Salvando..." : "Salvar meu código"}
      </button>
      {state?.error && <p className="text-center text-xs text-red-400">{state.error}</p>}
    </form>
  );
}
