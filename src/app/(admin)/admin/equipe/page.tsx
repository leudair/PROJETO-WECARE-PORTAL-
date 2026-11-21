import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { formatarHora, formatarMoeda, relatoriosPendentesGerente, resumoVendedora, statusDaEquipeHoje } from "@/lib/data/portal";
import { addDays, todayInSaoPaulo } from "@/lib/date";
import { StatCard } from "@/components/stat-card";

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

  const [equipe, pendentes] = await Promise.all([statusDaEquipeHoje(), relatoriosPendentesGerente()]);
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
    </div>
  );
}
