"use client";

import { useEffect, useRef, useState } from "react";

// Select nativo troca por uma caixinha por funcionario, em destaque, pra
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
        className="w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-left text-sm outline-none focus:border-primary"
      >
        {selected ? <span className="font-semibold text-primary">{selected.full_name}</span> : <span className="text-muted">Selecione</span>}
      </button>
      {open && (
        <div className="absolute z-10 mt-1 max-h-64 w-full space-y-1 overflow-y-auto rounded-lg border border-border bg-surface p-1.5 shadow-xl">
          {employees.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => {
                setSelectedId(e.id);
                setOpen(false);
              }}
              className="block w-full rounded-md bg-primary px-3 py-2 text-left text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              {e.full_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
