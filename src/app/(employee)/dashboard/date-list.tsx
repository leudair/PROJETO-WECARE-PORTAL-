"use client";

import { useState } from "react";
import Link from "next/link";

type DateSummary = { date: string; total: number; leads: number; clientes: number };

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

const VISIBLE_COUNT = 3;

export function DateList({ dates }: { dates: DateSummary[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? dates : dates.slice(0, VISIBLE_COUNT);
  const hidden = dates.length - visible.length;

  return (
    <div className="space-y-2">
      {visible.map(({ date, total, leads, clientes }) => (
        <Link
          key={date}
          href={`/dashboard/dia/${date}`}
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface p-4 hover:bg-surface-2"
        >
          <div>
            <p className="font-semibold text-foreground">Lembretes de {formatDate(date)}</p>
            <p className="text-xs text-muted">
              {clientes} cliente{clientes === 1 ? "" : "s"} · {leads} lead{leads === 1 ? "" : "s"}
            </p>
          </div>
          <span className="rounded-md border border-border px-3 py-1 text-xs text-primary">
            {total} lembrete{total === 1 ? "" : "s"} →
          </span>
        </Link>
      ))}

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full rounded-md border border-border py-2 text-xs text-muted hover:bg-surface-2 hover:text-foreground"
        >
          Ver mais {hidden} data{hidden === 1 ? "" : "s"}
        </button>
      )}
      {expanded && dates.length > VISIBLE_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="w-full rounded-md border border-border py-2 text-xs text-muted hover:bg-surface-2 hover:text-foreground"
        >
          Mostrar menos
        </button>
      )}
    </div>
  );
}
