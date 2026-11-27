// Linha de KPIs no estilo "console" (card de vidro, numero grande fino,
// sparkline) pedida pelo CEO pra deixar a Visao Geral mais visivel — mesma
// ideia visual de um dashboard de API (cards grandes com tendencia), mas
// com dados reais do Portal. So mostra sparkline onde existe serie
// historica de verdade (faturamento); os outros cards ficam sem grafico em
// vez de simular uma tendencia que nao existe.

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCompactCurrency(value: number) {
  if (value >= 1000) return `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return formatCurrency(value);
}

// Catmull-Rom suave, mesma tecnica de sparkline do prompt do Synapse —
// evita a linha quebrada que uma polyline reta daria com so 6 pontos.
function smoothPath(points: [number, number][]) {
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const f = (n: number) => n.toFixed(1);
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

function Sparkline({ values }: { values: number[] }) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const points: [number, number][] = values.map((v, i) => [(i * 120) / (values.length - 1), 40 - ((v - lo) / span) * 34]);
  const line = smoothPath(points);
  const area = `${line} L120 44 L0 44 Z`;
  return (
    <svg viewBox="0 0 120 44" className="h-11 w-[120px] overflow-visible">
      <defs>
        <linearGradient id="kpiSparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--primary)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#kpiSparkFill)" />
      <path d={line} fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" />
      <circle r="3" cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} fill="#fff" />
    </svg>
  );
}

function KpiCard({
  title,
  value,
  unit,
  delta,
  caption,
  sparkline,
}: {
  title: string;
  value: string;
  unit?: string;
  delta?: { text: string; positive: boolean } | null;
  caption: string;
  sparkline?: number[];
}) {
  return (
    <div className="card-glass relative overflow-hidden p-5">
      <h3 className="text-[13px] font-medium text-muted">{title}</h3>
      <div className="mt-2 flex items-baseline gap-1 text-[34px] font-light leading-none tracking-tight tabular-nums text-foreground">
        {value}
        {unit && <span className="text-lg text-muted">{unit}</span>}
      </div>
      <div className="mt-2 text-xs text-muted">
        {delta && (
          <b className={`mr-1.5 font-semibold ${delta.positive ? "text-green-400" : "text-red-400"}`}>{delta.text}</b>
        )}
        {caption}
      </div>
      {sparkline && sparkline.length > 1 && (
        <div className="absolute bottom-4 right-5">
          <Sparkline values={sparkline} />
        </div>
      )}
    </div>
  );
}

export function OverviewKpis({
  revenueSeries,
  moneyOnTableTotal,
  moneyOnTableCount,
  responseSent,
  responseReplied,
}: {
  revenueSeries: { label: string; total: number }[];
  moneyOnTableTotal: number;
  moneyOnTableCount: number;
  responseSent: number;
  responseReplied: number;
}) {
  const current = revenueSeries[revenueSeries.length - 1]?.total ?? 0;
  const previous = revenueSeries[revenueSeries.length - 2]?.total ?? 0;
  const revenueDelta =
    previous > 0 ? ((current - previous) / previous) * 100 : null;
  const sparkValues = revenueSeries.map((m) => m.total);
  const hasRevenueHistory = sparkValues.some((v) => v > 0);

  const responseRate = responseSent > 0 ? (responseReplied / responseSent) * 100 : null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <KpiCard
        title="Faturamento do mês"
        value={formatCompactCurrency(current)}
        caption="vs mês anterior"
        delta={
          revenueDelta === null
            ? null
            : { text: `${revenueDelta >= 0 ? "▲" : "▼"} ${Math.abs(revenueDelta).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`, positive: revenueDelta >= 0 }
        }
        sparkline={hasRevenueHistory ? sparkValues : undefined}
      />
      <KpiCard
        title="Dinheiro na mesa"
        value={formatCompactCurrency(moneyOnTableTotal)}
        caption={`${moneyOnTableCount} lead${moneyOnTableCount === 1 ? "" : "s"} em aberto`}
      />
      <KpiCard
        title="Taxa de resposta hoje"
        value={responseRate === null ? "—" : `${responseRate.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`}
        unit={responseRate === null ? undefined : "%"}
        caption={`${responseReplied} de ${responseSent} lembretes respondidos`}
      />
    </div>
  );
}
