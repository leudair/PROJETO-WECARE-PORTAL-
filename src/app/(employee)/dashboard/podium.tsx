import { getWeeklyLeaderboard } from "@/lib/data/finance";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatWeek(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

const MEDALS = ["🥇", "🥈", "🥉"];

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
        Faturamento oficial lançado pelo Financeiro · semana de {formatWeek(leaderboard[0].week_start_date)}. Vendas
        marcadas como convertidas entram aqui quando o Financeiro lançar o faturamento da semana.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {top3.map((row, i) => (
          <div
            key={row.employee_id}
            className="rounded-xl border border-border bg-surface p-4 text-center"
          >
            <div className="text-3xl">{MEDALS[i]}</div>
            <div className="mt-1 font-semibold text-foreground">{row.full_name}</div>
            <div className="text-lg font-bold text-primary">{formatCurrency(row.faturamento)}</div>
          </div>
        ))}
      </div>

      {rest.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <tbody>
              {rest.map((row, i) => (
                <tr key={row.employee_id} className="border-t border-border first:border-t-0">
                  <td className="px-4 py-2 text-muted">{i + 4}º</td>
                  <td className="px-4 py-2 text-foreground">{row.full_name}</td>
                  <td className="px-4 py-2 text-right text-muted">{formatCurrency(row.faturamento)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
