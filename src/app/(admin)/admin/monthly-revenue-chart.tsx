"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

export interface RevenueEntry {
  employeeName: string;
  monthKey: string; // "YYYY-MM"
  faturamento: number;
}

const MONTH_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTH_FULL = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const MONTHS_BACK = 5; // + mes atual = 6 colunas
const RUBY = "#e8455e"; // ruby claro — >=3:1 de contraste no fundo grafite (validado)
const GOLD = "#c9a227"; // ouro escovado — destaque do mes selecionado

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCompact(value: number) {
  if (value >= 1000) return `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return formatCurrency(value);
}

function monthKeyOf(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function CustomTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as { fullLabel: string; total: number };
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-xl">
      <p className="text-muted">{point.fullLabel}</p>
      <p className="mt-0.5 text-sm font-bold text-foreground">{formatCurrency(point.total)}</p>
    </div>
  );
}

// Faturamento mensal da equipe toda (soma) + ranking individual do mes
// selecionado — clicar numa barra troca o mes do ranking abaixo. Dados vem
// de monthly_revenue_entries (mesma tabela da tela "Faturamento mensal").
export function MonthlyRevenueChart({ entries }: { entries: RevenueEntry[] }) {
  const months = useMemo(() => {
    const now = new Date();
    const list = [];
    for (let i = -MONTHS_BACK; i <= 0; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = monthKeyOf(d.getFullYear(), d.getMonth());
      list.push({
        key,
        label: MONTH_ABBR[d.getMonth()],
        fullLabel: `${MONTH_FULL[d.getMonth()]} de ${d.getFullYear()}`,
        total: 0,
      });
    }
    for (const entry of entries) {
      const month = list.find((m) => m.key === entry.monthKey);
      if (month) month.total += entry.faturamento;
    }
    return list;
  }, [entries]);

  const [selectedKey, setSelectedKey] = useState(() => months[months.length - 1]?.key ?? "");

  const selectedIndex = months.findIndex((m) => m.key === selectedKey);
  const selectedMonth = months[selectedIndex];
  const previousMonth = selectedIndex > 0 ? months[selectedIndex - 1] : null;
  const delta =
    previousMonth && previousMonth.total > 0
      ? ((selectedMonth.total - previousMonth.total) / previousMonth.total) * 100
      : null;

  const ranking = useMemo(() => {
    const byEmployee = new Map<string, number>();
    for (const entry of entries) {
      if (entry.monthKey !== selectedKey) continue;
      byEmployee.set(entry.employeeName, (byEmployee.get(entry.employeeName) ?? 0) + entry.faturamento);
    }
    return [...byEmployee.entries()]
      .map(([employeeName, total]) => ({ employeeName, total }))
      .sort((a, b) => b.total - a.total);
  }, [entries, selectedKey]);

  const maxRankingTotal = Math.max(...ranking.map((r) => r.total), 1);
  const hasAnyData = months.some((m) => m.total > 0);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Faturamento mensal da equipe</h2>
          <p className="mt-0.5 text-xs text-muted">
            Soma do faturamento mensal de todas as funcionárias. Clique num mês pra ver o detalhamento individual.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{selectedMonth?.fullLabel}</p>
          <p className="text-2xl font-bold tabular-nums text-foreground">{formatCurrency(selectedMonth?.total ?? 0)}</p>
          {delta !== null && (
            <p className={`text-xs font-semibold ${delta >= 0 ? "text-green-400" : "text-red-400"}`}>
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs mês anterior
            </p>
          )}
        </div>
      </div>

      {!hasAnyData ? (
        <div className="mt-6 rounded-xl border border-border bg-background p-8 text-center text-sm text-muted">
          Nenhum faturamento mensal lançado ainda. Use o botão &quot;Faturamento mensal&quot; no Financeiro pra começar.
        </div>
      ) : (
        <>
          <div className="mt-6 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} margin={{ top: 24, right: 8, left: 8, bottom: 0 }} barCategoryGap="20%">
                <YAxis hide domain={[0, (max: number) => max * 1.25]} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                />
                <Tooltip content={CustomTooltip} cursor={{ fill: "var(--surface-2)" }} />
                <Bar
                  dataKey="total"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  onClick={(data) => setSelectedKey((data as { key: string }).key)}
                  className="cursor-pointer"
                >
                  {months.map((m) => (
                    <Cell key={m.key} fill={m.key === selectedKey ? GOLD : RUBY} fillOpacity={m.key === selectedKey ? 1 : 0.85} />
                  ))}
                  <LabelList
                    dataKey="total"
                    content={(props) => {
                      const { x, y, width, value, index } = props as { x: number; y: number; width: number; value: number; index: number };
                      if (months[index]?.key !== selectedKey || !value) return null;
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
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
              Por funcionária — {selectedMonth?.fullLabel}
            </h3>
            {ranking.length === 0 ? (
              <p className="text-sm text-muted">Nenhum lançamento mensal nesse mês ainda.</p>
            ) : (
              <div className="space-y-2">
                {ranking.map(({ employeeName, total }, i) => (
                  <div key={employeeName} className="relative overflow-hidden rounded-lg bg-background">
                    <div
                      className="absolute inset-y-0 left-0 bg-primary/15"
                      style={{ width: `${(total / maxRankingTotal) * 100}%` }}
                    />
                    <div className="relative flex items-center justify-between gap-2 px-3.5 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-muted">{i + 1}º</span>
                        <span className="text-sm font-medium text-foreground">{employeeName}</span>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-foreground">{formatCurrency(total)}</span>
                    </div>
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
