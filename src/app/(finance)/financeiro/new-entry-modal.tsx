"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { EntryForm } from "./entry-form";

export function NewEntryModal({
  employees,
  rates,
}: {
  employees: { id: string; full_name: string }[];
  rates: { tax: number; commission: number; variable: number };
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-glossy rounded-lg px-4 py-2.5 text-sm font-bold text-primary-foreground"
      >
        + Novo lançamento
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Lançamento semanal">
        <EntryForm employees={employees} rates={rates} onSaved={() => setOpen(false)} />
      </Modal>
    </>
  );
}
