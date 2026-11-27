import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { CRM_HISTORICO_GRUPOS, type CrmHistoricoGrupo } from "@/lib/data/crm-shared";
import { meuResumoCrm, minhaListaCrm } from "@/lib/data/employee-crm";

function whatsapp(tel: string) {
  return `https://wa.me/${tel.replace(/\D/g, "")}`;
}

function formatData(data: string | null) {
  if (!data) return "—";
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

const ROTULO_GRUPO: Record<CrmHistoricoGrupo, string> = {
  "cliente engajado": "Cliente engajado",
  "cliente parado": "Cliente parado",
  "lead engajado": "Lead engajado",
  "lead não engajado": "Lead não engajado",
};

// CRM da propria vendedora: os contatos dela organizados pelo historico de
// 6 meses de conversa. So mostra algo pra quem ja tem codigo em
// wa_funcionarios ligado ao numero que ja passou pelo processo (hoje W1 e W11).
export default async function MeuCrmPage({
  searchParams,
}: {
  searchParams: Promise<{ grupo?: string; busca?: string; pagina?: string }>;
}) {
  const { grupo: grupoParam, busca, pagina: paginaParam } = await searchParams;
  const grupo = CRM_HISTORICO_GRUPOS.find((g) => g === grupoParam);
  const pagina = Math.max(0, Number(paginaParam ?? 0) || 0);

  const resumo = await meuResumoCrm();

  if (!resumo) {
    return (
      <div className="space-y-6">
        <PageHeader title="CRM" description="Seus contatos organizados pelo histórico de conversa." />
        <div className="card-glass p-6 text-sm text-muted">
          Seus contatos ainda não foram organizados por aqui. Isso depende do histórico de conversa dos últimos 6 meses
          ser baixado e classificado primeiro. Fala com o CEO pra saber se o seu número já entrou nessa fila.
        </div>
      </div>
    );
  }

  const lista = await minhaListaCrm({ grupo, busca, pagina });
  const totalPaginas = Math.max(1, Math.ceil(lista.total / lista.porPagina));
  const query = (overrides: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    if (grupo) params.set("grupo", grupo);
    if (busca) params.set("busca", busca);
    if (pagina) params.set("pagina", String(pagina));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, String(v));
    }
    const s = params.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM"
        description={`${resumo.total.toLocaleString("pt-BR")} contatos seus, organizados pelo histórico de 6 meses. Foto de ${
          resumo.dataReferencia ? formatData(resumo.dataReferencia) : "—"
        }.`}
      />

      {resumo.codigo === "W11" && (
        <div className="card-glass border-l-4 border-l-yellow-500/70 p-4 text-sm text-muted">
          Essa classificação ainda não tem a sua agenda de contatos do e-mail importada, então usa só o nome salvo no
          WhatsApp. Pode errar mais cliente por lead do que o ideal.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {resumo.porGrupo.map(({ grupo: g, brasil, fora }) => (
          <Link key={g} href={query({ grupo: grupo === g ? undefined : g, pagina: undefined })}>
            <StatCard
              label={ROTULO_GRUPO[g]}
              value={(brasil + fora).toLocaleString("pt-BR")}
              subLabel={`${brasil.toLocaleString("pt-BR")} Brasil, ${fora.toLocaleString("pt-BR")} fora`}
              variant={grupo === g ? "positive" : "neutral"}
            />
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="barra-vidro">
          <Link href={query({ grupo: undefined, pagina: undefined })} className={!grupo ? "ativo" : ""}>
            Todos
          </Link>
          {CRM_HISTORICO_GRUPOS.map((g) => (
            <Link key={g} href={query({ grupo: g, pagina: undefined })} className={grupo === g ? "ativo" : ""}>
              {ROTULO_GRUPO[g]}
            </Link>
          ))}
        </nav>

        <form className="flex items-center gap-2">
          {grupo && <input type="hidden" name="grupo" value={grupo} />}
          <input
            type="search"
            name="busca"
            defaultValue={busca ?? ""}
            placeholder="Buscar por nome ou telefone"
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground placeholder:text-muted"
          />
          <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-surface-2">
            Buscar
          </button>
        </form>
      </div>

      <div className="card-glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="bg-surface-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3">Contato</th>
                <th className="px-5 py-3">Grupo na agenda</th>
                <th className="px-5 py-3">Detalhe</th>
                <th className="px-5 py-3">Última compra</th>
                <th className="px-5 py-3">Compras</th>
                <th className="px-5 py-3">Origem</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {lista.contatos.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-muted">
                    Nenhum contato encontrado.
                  </td>
                </tr>
              )}
              {lista.contatos.map((c) => (
                <tr key={c.chave} className="border-t border-border hover:bg-surface-2/60">
                  <td className="px-5 py-3 font-medium text-foreground">
                    {c.nome_novo || c.telefone}
                    <span className="block text-xs font-normal text-muted">{c.telefone}</span>
                  </td>
                  <td className="px-5 py-3 text-muted">{c.grupo_agenda ?? "—"}</td>
                  <td className="max-w-xs truncate px-5 py-3 text-muted" title={c.detalhe ?? ""}>
                    {c.detalhe ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-muted">{formatData(c.data_compra)}</td>
                  <td className="px-5 py-3 tabular-nums text-muted">{c.qtd_compras}</td>
                  <td className="px-5 py-3 text-muted">{c.origem ?? "—"}</td>
                  <td className="px-5 py-3 text-right">
                    <a href={whatsapp(c.telefone)} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                      WhatsApp
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-muted">
          <span>
            Página {pagina + 1} de {totalPaginas}, {lista.total.toLocaleString("pt-BR")} contatos no filtro atual
          </span>
          <div className="flex gap-2">
            {pagina > 0 && (
              <Link href={query({ pagina: pagina - 1 })} className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface-2">
                Anterior
              </Link>
            )}
            {pagina + 1 < totalPaginas && (
              <Link href={query({ pagina: pagina + 1 })} className="rounded-lg border border-border px-3 py-1.5 hover:bg-surface-2">
                Próxima
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
