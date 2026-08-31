import { getWeeklyLeaderboard } from "@/lib/data/finance";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// semana de trabalho vai de segunda a sabado (6 dias) — mesma logica usada
// no painel financeiro pra mostrar o periodo completo, nao so o inicio.
function formatWeekRange(weekStartIso: string) {
  const start = new Date(`${weekStartIso}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 5);
  return `${start.toLocaleDateString("pt-BR")} a ${end.toLocaleDateString("pt-BR")}`;
}

const MEDALS = ["🥇", "🥈", "🥉"];
// posiciona o 1o lugar ao centro e o 2o/3o nas laterais — silhueta de podio.
const PODIUM_ORDER = ["order-2", "order-1", "order-3"];

export async function Podium() {
  const leaderboard = await getWeeklyLeaderboard();

  if (leaderboard.length === 0) {
    return null;
  }

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div>
      <h2 className="mb-1 text-sm font-semibold text-foreground">Pódio da semana</h2>
      <p className="mb-3 text-xs text-muted">
        Faturamento oficial lançado pelo Financeiro · semana de {formatWeekRange(leaderboard[0].week_start_date)}. Vendas
        marcadas como convertidas entram aqui quando o Financeiro lançar o faturamento da semana.
      </p>

      <div className="grid grid-cols-3 items-end gap-3">
        {top3.map((row, i) => {
          const isFirst = i === 0;
          return (
            <div
              key={row.employee_id}
              className={`${PODIUM_ORDER[i]} rounded-2xl border border-border bg-gradient-to-b from-surface-2 to-surface text-center ${
                isFirst
                  ? "p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_20px_40px_-20px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.12)]"
                  : "p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_10px_24px_-16px_rgba(0,0,0,0.25)]"
              }`}
            >
              <div
                className={`mx-auto flex items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,var(--surface),var(--surface-2))] shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),inset_0_-2px_3px_rgba(0,0,0,0.15),0_2px_4px_rgba(0,0,0,0.15)] ${
                  isFirst ? "h-16 w-16 text-3xl" : "h-12 w-12 text-xl"
                }`}
              >
                {MEDALS[i]}
              </div>
              <div className={`mt-2 font-serif font-semibold text-foreground ${isFirst ? "text-base" : "text-sm"}`}>
                {row.full_name}
              </div>
              <div className={`font-serif font-bold tabular-nums text-primary ${isFirst ? "text-xl" : "text-base"}`}>
                {formatCurrency(row.faturamento)}
              </div>
            </div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <tbody>
              {rest.map((row, i) => (
                <tr key={row.employee_id} className="border-t border-border first:border-t-0">
                  <td className="px-4 py-2 text-muted">{i + 4}º</td>
                  <td className="px-4 py-2 text-foreground">{row.full_name}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted">{formatCurrency(row.faturamento)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
