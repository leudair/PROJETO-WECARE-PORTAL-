"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { FinanceIcon } from "@/components/icons";

export interface FaturamentoMes {
  mes: string; // "YYYY-MM"
  faturamento: number;
  lucro: number | null;
}

const MONTH_ABBR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCompact(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} mi`;
  if (value >= 1000) return `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return formatCurrency(value);
}

function labelOf(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  return `${MONTH_ABBR[m - 1]}/${String(y).slice(2)}`;
}

function CustomTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as { mes: string; faturamento: number };
  return (
    <div className="card-glass px-3 py-2 text-xs">
      <p className="text-muted">{labelOf(point.mes)}</p>
      <p className="mt-0.5 text-sm font-bold text-foreground">{formatCurrency(point.faturamento)}</p>
    </div>
  );
}

// Grafico grande de faturamento historico da empresa (todos os meses
// disponiveis, de 2024 pra ca) — pedido pelo CEO pra ser "bonito, que chama
// atencao" na Visao geral, em vez dos KPIs simples que tinham ali antes.
export function CompanyRevenueChart({ data }: { data: FaturamentoMes[] }) {
  const tiltRef = useRef<HTMLDivElement>(null);

  const total = data.reduce((sum, m) => sum + m.faturamento, 0);
  const atual = data[data.length - 1];
  const anterior = data[data.length - 2];
  const delta = anterior && anterior.faturamento > 0 ? ((atual.faturamento - anterior.faturamento) / anterior.faturamento) * 100 : null;

  // tick a cada 3 meses pra nao poluir o eixo com 34 pontos
  const tickValues = data.filter((_, i) => i % 3 === 0).map((m) => m.mes);

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
            <span className="icon-orb icon-orb-gold h-10 w-10 shrink-0 text-white">
              <FinanceIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground">Faturamento da empresa</h2>
              <p className="mt-0.5 text-xs text-muted">Desde {labelOf(data[0]?.mes ?? atual.mes)} — total acumulado no período</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Acumulado</p>
            <p className="text-2xl font-bold tabular-nums text-foreground [text-shadow:0_0_24px_rgba(232,69,94,0.35)]">
              {formatCompact(total)}
            </p>
            {delta !== null && (
              <p className={`text-xs font-semibold ${delta >= 0 ? "text-green-400" : "text-red-400"}`}>
                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% vs mês anterior
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 h-72 w-full" style={{ transform: "translateZ(30px)" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 24, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="rubyArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e8455e" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="#e8455e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="rubyLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#c9a227" />
                  <stop offset="100%" stopColor="#f06478" />
                </linearGradient>
              </defs>
              <YAxis hide domain={[0, (max: number) => max * 1.15]} />
              <XAxis
                dataKey="mes"
                ticks={tickValues}
                tickFormatter={labelOf}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
              />
              <Tooltip content={CustomTooltip} />
              <Area
                type="monotone"
                dataKey="faturamento"
                stroke="url(#rubyLine)"
                strokeWidth={2.5}
                fill="url(#rubyArea)"
                dot={false}
                activeDot={{ r: 5, fill: "#f06478", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
