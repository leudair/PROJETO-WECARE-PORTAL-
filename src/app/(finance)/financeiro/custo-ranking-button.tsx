"use client";

import { useEffect, useRef, useState } from "react";

export interface CustoRankingEntry {
  employeeName: string;
  weekLabel: string;
  custoOperacional: number;
  custoOperacionalPct: number;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Ranking do custo operacional (o unico "gasto" que tem alerta na tela) do
// maior pro menor — sino no topo da pagina em vez de marcar cada caixinha,
// pra mostrar de cara quem mais pesa no custo sem poluir a lista de lancamentos.
export function CustoRankingButton({
  entries,
  alertThreshold,
}: {
  entries: CustoRankingEntry[];
  alertThreshold: number;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const alertCount = entries.filter((e) => e.custoOperacionalPct > alertThreshold).length;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md border border-border bg-surface p-2.5 text-foreground hover:bg-background"
        aria-label="Ranking de maiores gastos"
      >
        🔔
        {alertCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
            {alertCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 max-h-96 w-80 overflow-y-auto rounded-md border border-border bg-surface p-3 shadow-lg">
          <p className="mb-2 text-xs font-semibold text-foreground">
            Maiores gastos (custo operacional), do maior pro menor
          </p>
          <div className="space-y-1">
            {entries.length === 0 && <p className="text-xs text-muted">Nenhum lançamento ainda.</p>}
            {entries.map((e, i) => (
              <div
                key={`${e.employeeName}-${e.weekLabel}-${i}`}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-xs hover:bg-background"
              >
                <div className="min-w-0">
                  <span className="font-medium text-foreground">
                    {i + 1}. {e.employeeName}
                  </span>
                  <span className="ml-1 text-muted">({e.weekLabel})</span>
                </div>
                <span
                  className={
                    e.custoOperacionalPct > alertThreshold
                      ? "shrink-0 font-semibold text-red-700 dark:text-red-400"
                      : "shrink-0 text-foreground"
                  }
                >
                  {formatCurrency(e.custoOperacional)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
