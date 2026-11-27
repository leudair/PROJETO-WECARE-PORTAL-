"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { createReuniao, deleteReuniao, listReunioesDoMes, type ReuniaoItem } from "./actions";

const MONTH_FULL = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthKeyOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Grade de dias do mes (com os dias "fantasma" do mes anterior/seguinte pra
// completar as semanas), no padrao domingo-primeiro.
function buildGrid(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startWeekday = first.getUTCDay();
  const cells: { key: string; day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ key: "", day: 0, inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ key: `${monthKey}-${String(d).padStart(2, "0")}`, day: d, inMonth: true });
  }
  while (cells.length % 7 !== 0) cells.push({ key: "", day: 0, inMonth: false });
  return cells;
}

export function ReuniaoPanel() {
  const [cursor, setCursor] = useState(() => new Date());
  const monthKey = useMemo(() => monthKeyOf(cursor), [cursor]);
  const [days, setDays] = useState<Record<string, ReuniaoItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(todayKey());
  const [pending, startTransition] = useTransition();

  const [formOpen, setFormOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [hora, setHora] = useState("");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    listReunioesDoMes(monthKey)
      .then((r) => setDays(r.days))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar reuniões."))
      .finally(() => setLoading(false));
  }, [monthKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca ao vivo do mes selecionado, sem estado inicial do servidor
    reload();
  }, [reload]);

  const grid = useMemo(() => buildGrid(monthKey), [monthKey]);
  const selectedItems = days[selected] ?? [];
  const totalMes = Object.values(days).reduce((n, list) => n + list.length, 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await createReuniao({ titulo, data: selected, hora: hora || null, observacao: observacao || null });
      setTitulo("");
      setHora("");
      setObservacao("");
      setFormOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  function onDelete(id: string) {
    startTransition(async () => {
      await deleteReuniao(id);
      reload();
    });
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold capitalize text-foreground">
            {MONTH_FULL[cursor.getMonth()]} {cursor.getFullYear()}
          </h3>
          <p className="text-xs text-muted">{totalMes} reunião{totalMes === 1 ? "" : "ões"} no mês</p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted hover:text-foreground"
            aria-label="Mês anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted hover:text-foreground"
            aria-label="Próximo mês"
          >
            ›
          </button>
        </div>
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-muted">
        {WEEKDAYS.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {grid.map((cell, i) => {
          if (!cell.inMonth) return <span key={i} />;
          const items = days[cell.key] ?? [];
          const isSelected = cell.key === selected;
          const isToday = cell.key === todayKey();
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => setSelected(cell.key)}
              className={[
                "relative flex h-10 flex-col items-center justify-center rounded-lg text-sm transition",
                isSelected ? "bg-primary text-white font-bold" : isToday ? "border border-primary/60 text-foreground" : "text-foreground hover:bg-surface-2",
              ].join(" ")}
            >
              {cell.day}
              {items.length > 0 && (
                <span
                  className={[
                    "absolute bottom-1 h-1 w-1 rounded-full",
                    isSelected ? "bg-white" : "bg-primary",
                  ].join(" ")}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">
            {selected.split("-").reverse().join("/")} — {selectedItems.length} reunião{selectedItems.length === 1 ? "" : "ões"}
          </h4>
          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            className="rounded-lg border border-primary/40 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10"
          >
            {formOpen ? "Cancelar" : "+ Nova"}
          </button>
        </div>

        {formOpen && (
          <form onSubmit={onSubmit} className="card-glass mb-3 space-y-2 p-3">
            <input
              type="text"
              placeholder="Cliente / assunto"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              <input
                type="text"
                placeholder="Observação (opcional)"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            {formError && <p className="text-xs text-red-400">{formError}</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-primary py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Salvando…" : "Salvar reunião"}
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-xs text-muted">Carregando…</p>
        ) : selectedItems.length === 0 ? (
          <p className="text-xs text-muted">Nenhuma reunião marcada nesse dia.</p>
        ) : (
          <div className="space-y-2">
            {selectedItems.map((item) => (
              <div key={item.id} className="card-glass flex items-start justify-between gap-2 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.hora && <span className="mr-1.5 font-mono text-xs text-primary">{item.hora.slice(0, 5)}</span>}
                    {item.titulo}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {item.contactName ? `${item.contactName} · ` : ""}
                    {item.ownerName}
                    {item.origem !== "manual" && " · automática"}
                  </p>
                  {item.observacao && <p className="mt-1 text-xs text-muted">{item.observacao}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  disabled={pending}
                  className="shrink-0 text-xs text-muted hover:text-red-400"
                  aria-label="Excluir"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
