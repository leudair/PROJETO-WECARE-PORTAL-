import { StatCard } from "@/components/stat-card";
import type { TelegramReminderRow, TelegramSellerSummary } from "@/lib/data/telegram-report";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
}

function instagramLabel(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

export function MonthFilter({ month, seller, sellers }: { month: string; seller?: string; sellers?: TelegramSellerSummary[] }) {
  return (
    <form method="get" className="flex flex-wrap items-center gap-2">
      <input type="month" name="mes" defaultValue={month} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground" />
      {sellers && (
        <select name="vendedora" defaultValue={seller ?? ""} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground">
          <option value="">Todas as vendedoras</option>
          {sellers.map((s) => (
            <option key={s.key} value={s.key}>
              {s.codigo ? `${s.codigo} · ` : ""}
              {s.nome ?? "?"}
            </option>
          ))}
        </select>
      )}
      <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">
        Ver
      </button>
    </form>
  );
}

export function TotalsCards({ summary }: { summary: TelegramSellerSummary[] }) {
  const enviados = summary.reduce((a, s) => a + s.enviados, 0);
  const compraram = summary.reduce((a, s) => a + s.compraram, 0);
  const vendido = summary.reduce((a, s) => a + s.totalVendido, 0);
  const sugerido = summary.reduce((a, s) => a + s.somaSugerido, 0);
  const taxa = enviados ? Math.round((compraram / enviados) * 1000) / 10 : 0;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Lembretes enviados" value={String(enviados)} />
      <StatCard label="Compraram depois" value={`${compraram} (${taxa.toLocaleString("pt-BR")}%)`} variant={compraram ? "positive" : "neutral"} />
      <StatCard label="Vendido depois" value={formatCurrency(vendido)} variant={vendido ? "positive" : "neutral"} />
      <StatCard label="Total sugerido" value={formatCurrency(sugerido)} />
    </div>
  );
}

export function SellerTable({ summary }: { summary: TelegramSellerSummary[] }) {
  if (summary.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3">Vendedora</th>
            <th className="px-4 py-3 text-right">Lembretes</th>
            <th className="px-4 py-3 text-right">Compraram</th>
            <th className="px-4 py-3 text-right">Vendido depois</th>
            <th className="px-4 py-3 text-right">Sugerido</th>
          </tr>
        </thead>
        <tbody>
          {summary.map((s) => (
            <tr key={s.key} className="border-t border-border">
              <td className="px-4 py-2 text-foreground">
                {s.codigo ? <span className="font-semibold text-primary">{s.codigo}</span> : null} {s.nome}
              </td>
              <td className="px-4 py-2 text-right tabular-nums">{s.enviados}</td>
              <td className="px-4 py-2 text-right tabular-nums">
                {s.compraram} ({s.enviados ? Math.round((s.compraram / s.enviados) * 100) : 0}%)
              </td>
              <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(s.totalVendido)}</td>
              <td className="px-4 py-2 text-right tabular-nums text-muted">{formatCurrency(s.somaSugerido)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReminderList({ rows, showSeller }: { rows: TelegramReminderRow[]; showSeller: boolean }) {
  if (rows.length === 0) {
    return <p className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">Nenhum lembrete enviado nesse mês.</p>;
  }
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.id} className="card-glass p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-foreground">{r.cliente_nome || "Cliente"}</p>
              <p className="text-muted">
                <a href={`https://wa.me/${r.cliente_telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {r.cliente_telefone}
                </a>
                {r.cliente_instagram && (
                  <>
                    {" · "}
                    <a href={r.cliente_instagram} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {instagramLabel(r.cliente_instagram)}
                    </a>
                  </>
                )}
              </p>
            </div>
            <div className="text-right text-xs text-muted">
              {showSeller && (
                <p>
                  {r.vendedora_codigo ? `${r.vendedora_codigo} · ` : ""}
                  {r.vendedora}
                </p>
              )}
              <p>Enviado {formatDateTime(r.enviado_em)}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <p>
              <span className="text-muted">Última compra: </span>
              {r.ultima_compra_valor != null ? formatCurrency(r.ultima_compra_valor) : "—"}
            </p>
            <p>
              <span className="text-muted">Sugerido: </span>
              {r.valor_sugerido != null ? formatCurrency(r.valor_sugerido) : "—"}
            </p>
            <p className={r.comprou_depois ? "font-semibold text-green-400" : "text-muted"}>
              {r.comprou_depois
                ? `Comprou ${formatCurrency(r.venda_depois_valor ?? 0)} em ${formatDateTime(r.venda_depois_em)}`
                : "Ainda não comprou"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
