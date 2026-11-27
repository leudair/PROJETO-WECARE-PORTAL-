"use client";

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { FinanceIcon } from "@/components/icons";
import type { FaturamentoMes } from "./company-revenue-chart";

const MONTH_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCompact(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi`;
  if (value >= 1000) return `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return formatCurrency(value);
}

function CustomTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as { label: string; faturamento: number };
  return (
    <div className="card-glass px-3 py-2 text-xs">
      <p className="text-muted">{point.label}</p>
      <p className="mt-0.5 text-sm font-bold text-foreground">{formatCurrency(point.faturamento)}</p>
    </div>
  );
}

// Detalhe ano a ano do faturamento da empresa (12 barras do ano selecionado),
// mais dramatico/3D que o grafico de visao geral de 3 anos — pedido pelo CEO
// pra ter tanto a visao longa quanto o detalhe mes a mes de um ano especifico.
export function CompanyRevenueYearChart({ data }: { data: FaturamentoMes[] }) {
  const tiltRef = useRef<HTMLDivElement>(null);
  const anos = useMemo(() => Array.from(new Set(data.map((m) => m.mes.slice(0, 4)))).sort(), [data]);
  const [ano, setAno] = useState(() => anos[anos.length - 1] ?? "");

  const meses = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const mesKey = `${ano}-${String(i + 1).padStart(2, "0")}`;
      const found = data.find((m) => m.mes === mesKey);
      return { mes: mesKey, label: MONTH_ABBR[i], faturamento: found?.faturamento ?? 0 };
    });
  }, [data, ano]);

  const totalAno = meses.reduce((sum, m) => sum + m.faturamento, 0);
  const maxMes = meses.reduce((best, m) => (m.faturamento > (best?.faturamento ?? -1) ? m : best), meses[0]);

  function onMove(e: ReactPointerEvent<HTMLDivElement>) {
    const el = tiltRef.current;
    if (!el || !matchMedia("(hover: hover)").matches) return;
    const r = el.getBoundingClientRect();
    const rx = -((e.clientY - r.top) / r.height - 0.5) * 3;
    const ry = ((e.clientX - r.left) / r.width - 0.5) * 4;
    el.style.transform = `perspective(1400px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
  }
  function onLeave() {
    if (tiltRef.current) tiltRef.current.style.transform = "perspective(1400px) rotateX(0) rotateY(0)";
  }

  return (
    <div onPointerMove={onMove} onPointerLeave={onLeave} style={{ perspective: 1400 }}>
      <div ref={tiltRef} className="card-glass p-5 transition-transform duration-300 ease-out sm:p-6" style={{ transformStyle: "preserve-3d" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="icon-orb h-10 w-10 shrink-0 text-white">
              <FinanceIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground">Faturamento por ano</h2>
              <p className="mt-0.5 text-xs text-muted">Mês a mês do ano selecionado — melhor mês em destaque.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <nav className="barra-vidro">
              {anos.map((a) => (
                <button key={a} type="button" onClick={() => setAno(a)} className={a === ano ? "ativo" : ""}>
                  {a}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <p className="mt-3 text-2xl font-bold tabular-nums text-foreground [text-shadow:0_0_24px_rgba(201,162,39,0.4)]">
          {formatCompact(totalAno)}
          <span className="ml-2 text-xs font-medium text-muted">total de {ano}</span>
        </p>

        <div className="mt-4 h-64 w-full" style={{ transform: "translateZ(30px)" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={meses} margin={{ top: 24, right: 8, left: 8, bottom: 0 }} barCategoryGap="20%">
              <defs>
                <linearGradient id="yearGoldBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ecd48f" />
                  <stop offset="100%" stopColor="#a9841d" />
                </linearGradient>
                <linearGradient id="yearRubyBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f06478" />
                  <stop offset="100%" stopColor="#b0102f" />
                </linearGradient>
              </defs>
              <YAxis hide domain={[0, (max: number) => max * 1.2]} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
              <Tooltip content={CustomTooltip} cursor={{ fill: "var(--surface-2)" }} />
              <Bar dataKey="faturamento" radius={[6, 6, 0, 0]} maxBarSize={44}>
                {meses.map((m) => (
                  <Cell key={m.mes} fill={m.mes === maxMes?.mes && m.faturamento > 0 ? "url(#yearGoldBar)" : "url(#yearRubyBar)"} />
                ))}
                <LabelList
                  dataKey="faturamento"
                  content={(props) => {
                    const { x, y, width, value, index } = props as { x: number; y: number; width: number; value: number; index: number };
                    if (!value || meses[index]?.mes !== maxMes?.mes) return null;
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
      </div>
    </div>
  );
}
