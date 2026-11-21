import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { CORES, contagemCores, listaContatosCor, vendedoras } from "@/lib/data/portal";
import type { CorContato } from "@/lib/supabase/database.types";

function rotulo(nome: string) {
  return nome.match(/^W\d+/i)?.[0]?.toUpperCase() ?? nome.split(" ")[0];
}

function whatsapp(tel: string) {
  return `https://wa.me/${tel.replace(/\D/g, "")}`;
}

// Aba Contatos: uma aba por vendedora; dentro, os contatos dela separados por cor.
export default async function ContatosPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; cor?: string }>;
}) {
  const { v, cor: corParam } = await searchParams;
  const lista = await vendedoras();
  const atual = lista.find((p) => p.id === v) ?? lista[0];
  const cor = (CORES.find((c) => c.cor === corParam)?.cor ?? "verde") as CorContato;

  const [contagem, contatos] = atual
    ? await Promise.all([contagemCores(atual.id), listaContatosCor(atual.id, cor)])
    : [null, []];

  return (
    <div className="space-y-6">
      <PageHeader title="Contatos" description="Os contatos de cada vendedora, separados por cor." />

      <nav className="barra-vidro">
        {lista.map((p) => (
          <Link key={p.id} href={`?v=${p.id}&cor=${cor}`} className={p.id === atual?.id ? "ativo" : ""} title={p.full_name}>
            {rotulo(p.full_name)}
          </Link>
        ))}
      </nav>

      {atual && (
        <h2 className="text-lg font-semibold text-foreground">{atual.full_name}</h2>
      )}

      {contagem === null ? (
        <div className="card-glass p-6 text-sm text-muted">
          A contagem por cor aparece assim que a atualização do banco for aplicada.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {CORES.map((c) => (
              <Link
                key={c.cor}
                href={`?v=${atual?.id}&cor=${c.cor}`}
                className={`card-glass p-4 transition hover:-translate-y-0.5 ${c.cor === cor ? "ring-2 ring-primary" : ""}`}
              >
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  <span className={`ponto-status bg-current ${c.classe}`} />
                  {c.label}
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">{contagem[c.cor] ?? 0}</p>
                <p className="mt-1 text-xs text-muted">{c.descricao}</p>
              </Link>
            ))}
          </div>

          <div className="card-glass overflow-x-auto p-5">
            {contatos.length === 0 ? (
              <p className="text-sm text-muted">Nenhum contato nessa cor.</p>
            ) : (
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr>
                    <th className="pb-2">Cliente</th>
                    <th className="pb-2">Compras</th>
                    <th className="pb-2">Valor estimado</th>
                    <th className="pb-2">Última compra</th>
                    <th className="pb-2">Observação</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {contatos.map((k) => (
                    <tr key={k.telefone}>
                      <td className="py-2 text-foreground">{k.nome || k.telefone}</td>
                      <td className="py-2 tabular-nums">{k.qtd_compras ?? 0}</td>
                      <td className="py-2 tabular-nums">
                        {k.valor_estimado != null
                          ? Number(k.valor_estimado).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                          : "—"}
                      </td>
                      <td className="py-2">
                        {k.data_compra ? new Date(`${k.data_compra}T00:00:00`).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="max-w-xs truncate py-2 text-muted" title={k.motivo ?? ""}>
                        {k.motivo ?? "—"}
                      </td>
                      <td className="py-2 text-right">
                        <a href={whatsapp(k.telefone)} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                          WhatsApp
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="mt-3 text-xs text-muted">
              Mostrando até 100, dos maiores valores para os menores. Hoje a classificação é só do número 47 99219-0251.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
