"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { FinanceIcon } from "@/components/icons";

export interface SaleEntry {
  name: string;
  last_purchase_value: number;
  converted_at: string; // ISO timestamp
}

const WEEKS_BACK = 7; // + semana atual = 8 colunas

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCompact(value: number) {
  if (value >= 1000) return `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return formatCurrency(value);
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Mesma regra de "segunda-feira da semana" usada no lançamento do Financeiro
// (entry-form.tsx) — mantém os dois calendários de semana alinhados.
function mondayOf(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatShort(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function CustomTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as { fullLabel: string; total: number };
  return (
    <div className="card-glass px-3 py-2 text-xs">
      <p className="text-muted">{point.fullLabel}</p>
      <p className="mt-0.5 text-sm font-bold text-foreground">{formatCurrency(point.total)}</p>
    </div>
  );
}

// Vendas que ela mesma marcou como convertidas, por semana — pra ela
// acompanhar o próprio ritmo sem esperar o Financeiro lançar o faturamento
// oficial da semana (esse é o registro bruto dela, na hora).
export function MySalesChart({ entries }: { entries: SaleEntry[] }) {
  const weeks = useMemo(() => {
    const thisMonday = mondayOf(new Date());
    const list = [];
    for (let i = -WEEKS_BACK; i <= 0; i++) {
      const monday = new Date(thisMonday);
      monday.setDate(monday.getDate() + i * 7);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      list.push({
        key: toDateKey(monday),
        label: formatShort(monday),
        fullLabel: `semana de ${formatShort(monday)} a ${formatShort(sunday)}`,
        total: 0,
      });
    }
    for (const entry of entries) {
      const monday = toDateKey(mondayOf(new Date(entry.converted_at)));
      const week = list.find((w) => w.key === monday);
      if (week) week.total += entry.last_purchase_value;
    }
    return list;
  }, [entries]);

  const [selectedKey, setSelectedKey] = useState(() => weeks[weeks.length - 1]?.key ?? "");
  const selectedWeek = weeks.find((w) => w.key === selectedKey);

  const salesInSelectedWeek = useMemo(() => {
    return entries
      .filter((entry) => toDateKey(mondayOf(new Date(entry.converted_at))) === selectedKey)
      .sort((a, b) => b.converted_at.localeCompare(a.converted_at));
  }, [entries, selectedKey]);

  const hasAnyData = weeks.some((w) => w.total > 0);
  const totalPeriod = weeks.reduce((sum, w) => sum + w.total, 0);

  return (
    <div className="card-glass p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="icon-orb h-10 w-10 shrink-0 text-white">
            <FinanceIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-foreground">Minhas vendas</h2>
            <p className="mt-0.5 text-xs text-muted">
              Vendas que você marcou como convertidas, por semana. Clique numa barra pra ver o detalhe.
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{selectedWeek?.fullLabel}</p>
          <p className="text-2xl font-bold tabular-nums text-foreground [text-shadow:0_0_24px_rgba(232,69,94,0.35)]">
            {formatCurrency(selectedWeek?.total ?? 0)}
          </p>
        </div>
      </div>

      {!hasAnyData ? (
        <div className="mt-6 rounded-xl border border-border bg-background p-8 text-center text-sm text-muted">
          Nenhuma venda marcada ainda. Use &quot;Marcar como convertido&quot; num lead ou cliente pra começar.
        </div>
      ) : (
        <>
          <div className="mt-6 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeks} margin={{ top: 24, right: 8, left: 8, bottom: 0 }} barCategoryGap="20%">
                <defs>
                  <linearGradient id="mySalesRubyBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f06478" />
                    <stop offset="100%" stopColor="#b0102f" />
                  </linearGradient>
                  <linearGradient id="mySalesGoldBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ecd48f" />
                    <stop offset="100%" stopColor="#a9841d" />
                  </linearGradient>
                </defs>
                <YAxis hide domain={[0, (max: number) => max * 1.25]} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
                <Tooltip content={CustomTooltip} cursor={{ fill: "var(--surface-2)" }} />
                <Bar
                  dataKey="total"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                  onClick={(data) => setSelectedKey((data as { key: string }).key)}
                  className="cursor-pointer"
                >
                  {weeks.map((w) => (
                    <Cell key={w.key} fill={w.key === selectedKey ? "url(#mySalesGoldBar)" : "url(#mySalesRubyBar)"} />
                  ))}
                  <LabelList
                    dataKey="total"
                    content={(props) => {
                      const { x, y, width, value, index } = props as { x: number; y: number; width: number; value: number; index: number };
                      if (weeks[index]?.key !== selectedKey || !value) return null;
                      return (
                        <text x={x + width / 2} y={y - 8} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--foreground)">
                          {formatCompact(Number(value))}
                        </text>
                      );
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{selectedWeek?.fullLabel}</h3>
              <span className="text-xs text-muted">Últimas {WEEKS_BACK + 1} semanas: {formatCurrency(totalPeriod)}</span>
            </div>
            {salesInSelectedWeek.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma venda marcada nessa semana.</p>
            ) : (
              <div className="space-y-2">
                {salesInSelectedWeek.map((sale, i) => (
                  <div key={`${sale.name}-${sale.converted_at}-${i}`} className="flex items-center justify-between gap-2 rounded-lg bg-background px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{sale.name}</p>
                      <p className="text-xs text-muted">{new Date(sale.converted_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-green-400">
                      {formatCurrency(sale.last_purchase_value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
