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
    <div className="space-y-2.5">
      {visible.map(({ date, total, leads, clientes }) => (
        <Link
          key={date}
          href={`/dashboard/dia/${date}`}
          className="card-glass group flex flex-wrap items-center justify-between gap-3 p-5 transition hover:border-primary/40"
        >
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="icon-orb h-10 w-10 shrink-0 text-xs font-bold text-white">
              {new Date(`${date}T00:00:00`).getDate()}
            </span>
            <div className="min-w-0">
              <h3 className="font-bold text-foreground">{formatDate(date)}</h3>
              <p className="mt-0.5 text-xs text-muted">
                {clientes} cliente{clientes === 1 ? "" : "s"} · {leads} lead{leads === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-primary">
            {total} lembrete{total === 1 ? "" : "s"}
            <span className="transition group-hover:translate-x-0.5">→</span>
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
