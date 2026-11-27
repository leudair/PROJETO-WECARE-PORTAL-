import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { formatarHora, formatarMoeda, relatoriosPendentesGerente, resumoVendedora, statusDaEquipeHoje } from "@/lib/data/portal";
import { addDays, todayInSaoPaulo } from "@/lib/date";
import { StatCard } from "@/components/stat-card";
import { listOverview, listEmployeeContactSummaries } from "@/lib/data/admin";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PERIODOS = [
  { chave: "hoje", label: "Hoje", dias: 0 },
  { chave: "7", label: "7 dias", dias: 6 },
  { chave: "30", label: "30 dias", dias: 29 },
] as const;

function codigoW(nome: string) {
  return nome.match(/^W\d+/i)?.[0]?.toUpperCase() ?? nome.slice(0, 2).toUpperCase();
}

export default async function EquipePage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const { periodo: periodoParam } = await searchParams;
  const periodo = PERIODOS.find((p) => p.chave === periodoParam) ?? PERIODOS[0];
  const ate = todayInSaoPaulo();
  const de = addDays(ate, -periodo.dias);

  const [equipe, pendentes, { moneyOnTable }, employeeSummaries] = await Promise.all([
    statusDaEquipeHoje(),
    relatoriosPendentesGerente(),
    listOverview(),
    listEmployeeContactSummaries(),
  ]);
  const abertas = equipe.filter((e) => e.expediente).length;

  // Ranking: numeros de cada vendedora no periodo (Portal + site).
  const resumos = await Promise.all(equipe.map((e) => resumoVendedora(e.profile.id, de, ate)));
  const ranking = equipe
    .map((e, i) => {
      const r = resumos[i];
      const qtd = (r?.vendas_portal_qtd ?? 0) + (r?.site_vendas_qtd ?? 0);
      const valor = Number(r?.vendas_portal_valor ?? 0) + Number(r?.site_vendas_valor ?? 0);
      const enviados = r?.disparos_enviados ?? 0;
      const taxa = enviados > 0 ? Math.round(((r?.disparos_respondidos ?? 0) / enviados) * 100) : 0;
      return { nome: e.profile.full_name, id: e.profile.id, qtd, valor, taxa };
    })
    .sort((a, b) => b.valor - a.valor || b.qtd - a.qtd);
  const totalQtd = ranking.reduce((s, r) => s + r.qtd, 0);
  const totalValor = ranking.reduce((s, r) => s + r.valor, 0);
  const temDados = resumos.some(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipe hoje"
        description={`${abertas} de ${equipe.length} abriram o dia. Clique numa vendedora para ver tudo dela.`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {equipe.map(({ profile, expediente, relatorio }) => {
          const cor = relatorio
            ? "text-zinc-400"
            : expediente
              ? "text-green-400"
              : "text-red-500";
          const status = relatorio
            ? `Fechou ${formatarHora(relatorio.assinado_em)}`
            : expediente
              ? `Abriu ${formatarHora(expediente.aberto_em)}`
              : "Não abriu";
          return (
            <Link key={profile.id} href={`/admin/equipe/${profile.id}`} className="card-glass group p-4 transition hover:-translate-y-0.5">
              <div className="flex items-center gap-3">
                <span className="icon-orb h-11 w-11 shrink-0 text-sm font-bold text-white">{codigoW(profile.full_name)}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {profile.full_name.replace(/^W\d+\s*-\s*/i, "")}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-muted">
                    <span className={`ponto-status bg-current ${cor}`} />
                    {status}
                  </p>
                </div>
              </div>
              {relatorio && (
                <p className="mt-2 text-[11px] text-muted">
                  {relatorio.gerente_assinado_em ? "Gerente assinou" : "Aguarda a gerente"}
                </p>
              )}
            </Link>
          );
        })}
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-foreground">Ranking de vendas</h2>
          <nav className="barra-vidro">
            {PERIODOS.map((p) => (
              <Link key={p.chave} href={`?periodo=${p.chave}`} className={p.chave === periodo.chave ? "ativo" : ""}>
                {p.label}
              </Link>
            ))}
          </nav>
        </div>
        {!temDados ? (
          <div className="card-glass p-5 text-sm text-muted">
            O ranking aparece assim que a atualização do banco for aplicada.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <StatCard label="Faturamento da equipe" value={formatarMoeda(totalValor)} variant={totalValor > 0 ? "positive" : "neutral"} />
              <StatCard label="Vendas" value={String(totalQtd)} />
              <StatCard label="Ticket médio" value={totalQtd > 0 ? formatarMoeda(totalValor / totalQtd) : "—"} />
            </div>
            <div className="card-glass p-5">
              <ol className="divide-y divide-border">
                {ranking.map((r, i) => (
                  <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className={`w-6 text-center font-bold tabular-nums ${i < 3 ? "text-gold" : "text-muted"}`}>{i + 1}º</span>
                    <Link href={`/admin/equipe/${r.id}`} className="min-w-0 flex-1 truncate text-foreground hover:text-primary">
                      {r.nome}
                    </Link>
                    <span className="hidden text-xs text-muted sm:inline">resposta {r.taxa}%</span>
                    <span className="w-16 text-right tabular-nums text-muted">{r.qtd} vend.</span>
                    <span className="w-28 text-right font-semibold tabular-nums text-foreground">{formatarMoeda(r.valor)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}
      </div>

      <div className="card-glass p-5">
        <h2 className="mb-3 text-base font-bold text-foreground">Relatórios aguardando a gerente ({pendentes.length})</h2>
        {pendentes.length === 0 ? (
          <p className="text-sm text-muted">Nenhum relatório pendente.</p>
        ) : (
          <ul className="divide-y divide-border">
            {pendentes.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="text-foreground">
                  {r.nome} · {new Date(`${r.dia}T00:00:00`).toLocaleDateString("pt-BR")}
                </span>
                <Link href={`/admin/equipe/${r.profile_id}#relatorios`} className="text-xs text-primary hover:underline">
                  Conferir e assinar
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-4">
          <h2 className="text-base font-bold text-foreground">Dinheiro na mesa</h2>
          <p className="mt-0.5 text-xs text-muted">
            Soma do valor de interesse dos leads ainda não convertidos, por funcionário — quem tem mais aqui
            está convertendo pior e vale acompanhar de perto.
          </p>
        </div>
        {moneyOnTable.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-muted">
            Nenhum lead em aberto no momento.
          </div>
        ) : (
          <div className="space-y-2.5">
            {(() => {
              const maxTotal = Math.max(...moneyOnTable.map((r) => r.total), 1);
              return moneyOnTable.map(({ employee, total, count }, i) => (
                <div key={employee.id} className="card-glass relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500/20 to-red-500/5"
                    style={{ width: `${(total / maxTotal) * 100}%` }}
                  />
                  <div className="relative flex items-center justify-between gap-2 px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted">{i + 1}º</span>
                      <span className="font-semibold text-foreground">{employee.full_name}</span>
                      <span className="text-xs text-muted">
                        {count} lead{count === 1 ? "" : "s"} em aberto
                      </span>
                    </div>
                    <span className="text-lg font-bold tabular-nums text-red-400">{formatCurrency(total)}</span>
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      <div>
        <div className="mb-4">
          <h2 className="text-base font-bold text-foreground">Lembretes por funcionário</h2>
          <p className="mt-0.5 text-xs text-muted">Clique num funcionário pra ver todos os lembretes cadastrados por ele.</p>
        </div>
        <div className="card-glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="bg-surface-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3">Funcionário</th>
                  <th className="px-5 py-3">Clientes</th>
                  <th className="px-5 py-3">Leads</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {employeeSummaries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-muted">
                      Nenhum funcionário cadastrado ainda.
                    </td>
                  </tr>
                )}
                {employeeSummaries.map(({ employee, total, leads, clientes }) => (
                  <tr key={employee.id} className="border-t border-border hover:bg-surface-2/60">
                    <td className="px-5 py-3 font-medium text-foreground">{employee.full_name}</td>
                    <td className="px-5 py-3 text-muted">{clientes}</td>
                    <td className="px-5 py-3 text-muted">{leads}</td>
                    <td className="px-5 py-3 text-muted">{total}</td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/funcionario/${employee.id}`}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-primary hover:bg-surface-2"
                      >
                        Ver lembretes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
