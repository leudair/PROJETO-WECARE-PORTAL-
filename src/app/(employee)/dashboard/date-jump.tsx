"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export function DateJump({ today }: { today: string }) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/dashboard/dia/${today}`}
        className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
      >
        Hoje
      </Link>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const date = new FormData(e.currentTarget).get("date");
          if (typeof date === "string" && date) {
            router.push(`/dashboard/dia/${date}`);
          }
        }}
        className="flex items-center gap-1.5"
      >
        <input
          type="date"
          name="date"
          required
          className="rounded-md border border-border px-2 py-1 text-xs"
        />
        <button
          type="submit"
          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-foreground"
        >
          Ver data
        </button>
      </form>
    </div>
  );
}
