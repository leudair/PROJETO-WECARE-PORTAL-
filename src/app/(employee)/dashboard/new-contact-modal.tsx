"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { ContactForm } from "./contact-form";

export function NewContactModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-glossy rounded-lg px-4 py-2.5 text-sm font-bold text-primary-foreground">
        + Novo lembrete
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Novo lembrete de contato">
        <ContactForm onSaved={() => setOpen(false)} />
      </Modal>
    </>
  );
}
