import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { formatarHora, relatoriosPendentesGerente, statusDaEquipeHoje } from "@/lib/data/portal";

function codigoW(nome: string) {
  return nome.match(/^W\d+/i)?.[0]?.toUpperCase() ?? nome.slice(0, 2).toUpperCase();
}

export default async function EquipePage() {
  const [equipe, pendentes] = await Promise.all([statusDaEquipeHoje(), relatoriosPendentesGerente()]);
  const abertas = equipe.filter((e) => e.expediente).length;

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
