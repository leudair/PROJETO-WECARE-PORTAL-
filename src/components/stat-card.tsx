import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  icon,
  subLabel,
  variant = "neutral",
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  subLabel?: string;
  variant?: "neutral" | "positive" | "negative";
}) {
  const valueColor =
    variant === "positive" ? "text-green-400" : variant === "negative" ? "text-red-400" : "text-foreground";

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        {icon && <span className="shrink-0 text-muted">{icon}</span>}
      </div>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      {subLabel && <p className="mt-1 text-xs text-muted">{subLabel}</p>}
    </div>
  );
}
