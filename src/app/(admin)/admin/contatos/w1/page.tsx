import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { CRM_W1_GRUPOS, listaCrmW1, resumoCrmW1, type CrmW1Grupo } from "@/lib/data/admin";

function whatsapp(tel: string) {
  return `https://wa.me/${tel.replace(/\D/g, "")}`;
}

function formatData(data: string | null) {
  if (!data) return "—";
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

const ROTULO_GRUPO: Record<CrmW1Grupo, string> = {
  "cliente engajado": "Cliente engajado",
  "cliente parado": "Cliente parado",
  "lead engajado": "Lead engajado",
  "lead não engajado": "Lead não engajado",
};

// Contatos do W1 (Eduarda), organizados pelo historico de 6 meses. Importado
// via W1-para-o-CRM.md em 27/11/2026 — classificacao e uma foto daquele dia.
export default async function ContatosW1Page({
  searchParams,
}: {
  searchParams: Promise<{ grupo?: string; busca?: string; pagina?: string }>;
}) {
  const { grupo: grupoParam, busca, pagina: paginaParam } = await searchParams;
  const grupo = CRM_W1_GRUPOS.find((g) => g === grupoParam);
  const pagina = Math.max(0, Number(paginaParam ?? 0) || 0);

  const [resumo, lista] = await Promise.all([resumoCrmW1(), listaCrmW1({ grupo, busca, pagina })]);

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
        title="Contatos do W1"
        description={`Eduarda · ${resumo.total.toLocaleString("pt-BR")} contatos, organizados pelo histórico de 6 meses. Foto de ${
          resumo.dataReferencia ? formatData(resumo.dataReferencia) : "—"
        }.`}
      />

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
          {CRM_W1_GRUPOS.map((g) => (
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
