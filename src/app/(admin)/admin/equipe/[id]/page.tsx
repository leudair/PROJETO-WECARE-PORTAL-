import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addDays, todayInSaoPaulo } from "@/lib/date";
import { getEmployeeSiteUrl } from "@/lib/employee-site";
import {
  expedientesDaVendedora,
  formatarHora,
  relatoriosDaVendedora,
  resumoVendedora,
} from "@/lib/data/portal";
import { ResumoCards } from "@/components/resumo-cards";
import { AssinaturaForm } from "@/components/assinatura-form";
import { gerenteAssinarAction } from "@/lib/actions/assinatura";

const PERIODOS = [
  { chave: "hoje", label: "Hoje", dias: 0 },
  { chave: "7", label: "7 dias", dias: 6 },
  { chave: "15", label: "15 dias", dias: 14 },
  { chave: "30", label: "30 dias", dias: 29 },
] as const;

function dataBR(dia: string) {
  return new Date(`${dia}T00:00:00`).toLocaleDateString("pt-BR");
}

export default async function FichaVendedoraPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { id } = await params;
  const { periodo: periodoParam } = await searchParams;
  const periodo = PERIODOS.find((p) => p.chave === periodoParam) ?? PERIODOS[0];
  const ate = todayInSaoPaulo();
  const de = addDays(ate, -periodo.dias);

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!profile) notFound();

  const [resumo, expedientes, relatorios] = await Promise.all([
    resumoVendedora(id, de, ate),
    expedientesDaVendedora(id, 15),
    relatoriosDaVendedora(id, 15),
  ]);
  const siteUrl = getEmployeeSiteUrl(profile.full_name);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/equipe" className="text-xs text-primary hover:underline">
          ← Voltar para a equipe
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{profile.full_name}</h1>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/equipe/${id}/ver-como`} className="btn-vidro btn-vidro-ativo">
              Ver como ela
            </Link>
            <Link href={`/admin/funcionario/${id}`} className="btn-vidro">
              Lembretes e clientes
            </Link>
            {siteUrl && (
              <a href={siteUrl} target="_blank" rel="noreferrer" className="btn-vidro">
                Site dela
              </a>
            )}
            <span className="btn-vidro cursor-default opacity-50" title="Em breve">CRM (em breve)</span>
            <span className="btn-vidro cursor-default opacity-50" title="Em breve">Loja online (em breve)</span>
          </div>
        </div>
      </div>

      <nav className="barra-vidro">
        {PERIODOS.map((p) => (
          <Link key={p.chave} href={`?periodo=${p.chave}`} className={p.chave === periodo.chave ? "ativo" : ""}>
            {p.label}
          </Link>
        ))}
      </nav>

      {resumo ? (
        <ResumoCards resumo={resumo} />
      ) : (
        <p className="text-sm text-muted">Não foi possível carregar os números.</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-glass p-5">
          <h2 className="mb-3 text-base font-bold text-foreground">Abertura e fechamento do dia</h2>
          {expedientes.length === 0 ? (
            <p className="text-sm text-muted">Ainda não abriu nenhum dia pelo Portal.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="pb-2">Dia</th>
                  <th className="pb-2">Abriu</th>
                  <th className="pb-2">Fechou</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expedientes.map((e) => (
                  <tr key={e.id}>
                    <td className="py-1.5 text-foreground">{dataBR(e.dia)}</td>
                    <td className="py-1.5 tabular-nums">{formatarHora(e.aberto_em)}</td>
                    <td className={`py-1.5 tabular-nums ${e.fechado_em ? "" : "text-red-400"}`}>
                      {e.fechado_em ? formatarHora(e.fechado_em) : "não fechou"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div id="relatorios" className="card-glass p-5">
          <h2 className="mb-3 text-base font-bold text-foreground">Relatórios assinados</h2>
          {relatorios.length === 0 ? (
            <p className="text-sm text-muted">Nenhum relatório ainda.</p>
          ) : (
            <ul className="space-y-4">
              {relatorios.map((r) => {
                const qtd = (r.resumo.vendas_portal_qtd ?? 0) + (r.resumo.site_vendas_qtd ?? 0);
                const valor = Number(r.resumo.vendas_portal_valor ?? 0) + Number(r.resumo.site_vendas_valor ?? 0);
                return (
                  <li key={r.id} className="rounded-xl border border-border p-3">
                    <p className="text-sm font-semibold text-foreground">
                      {dataBR(r.dia)} · {qtd} venda{qtd === 1 ? "" : "s"} ·{" "}
                      {valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                    <p className="text-xs text-muted">Ela assinou às {formatarHora(r.assinado_em)}</p>
                    {r.observacao && <p className="mt-1 text-xs text-foreground">“{r.observacao}”</p>}
                    <div className="mt-2">
                      {r.gerente_assinado_em ? (
                        <p className="text-xs text-green-400">
                          Gerente assinou às {formatarHora(r.gerente_assinado_em)}
                          {r.gerente_observacao ? ` · ${r.gerente_observacao}` : ""}
                        </p>
                      ) : (
                        <AssinaturaForm
                          action={gerenteAssinarAction}
                          botao="Conferi, assinar"
                          hidden={{ relatorio: String(r.id) }}
                          observacao="Comentário da gerente (opcional)"
                          compacto
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
