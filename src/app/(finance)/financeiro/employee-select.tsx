"use client";

import { useEffect, useRef, useState } from "react";

// Select nativo troca por uma caixinha por funcionario, em vermelho, pra
// ficar facil de bater o olho e achar o nome certo na lista.
export function EmployeeSelect({ employees }: { employees: { id: string; full_name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selected = employees.find((e) => e.id === selectedId);

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name="employeeId" value={selectedId} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-md border border-border px-3 py-2 text-left text-sm"
      >
        {selected ? (
          <span className="font-medium text-red-700 dark:text-red-400">{selected.full_name}</span>
        ) : (
          <span className="text-muted">Selecione</span>
        )}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 w-full space-y-1 rounded-md border border-border bg-surface p-1 shadow-lg max-h-64 overflow-y-auto">
          {employees.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => {
                setSelectedId(e.id);
                setOpen(false);
              }}
              className="block w-full rounded-md border border-red-300 bg-red-50 px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
            >
              {e.full_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
