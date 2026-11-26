import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { listCrmContacts, listCrmFilterOptions, type CrmFilters } from "@/lib/data/admin";

function rotulo(nome: string) {
  return nome.match(/^W\d+/i)?.[0]?.toUpperCase() ?? nome.split(" ")[0];
}

function whatsapp(tel: string) {
  return `https://wa.me/${tel.replace(/\D/g, "")}`;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

const SOURCE_LABEL: Record<string, string> = {
  piperun_migration: "Migração PipeRun",
  wa_crm: "Comando da equipe (WhatsApp)",
  wa_ia_pedido: "Pedido automático (WhatsApp oficial)",
  zia_pedido: "Pedido automático (Z-API)",
};

function origemLabel(source: string | null) {
  if (!source) return "Manual (Portal)";
  return SOURCE_LABEL[source] ?? source;
}

// monta a query string preservando os filtros atuais e trocando so o que foi passado
function hrefComFiltro(atual: Record<string, string | undefined>, trocar: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  const combinado = { ...atual, ...trocar };
  for (const [k, v] of Object.entries(combinado)) if (v) params.set(k, v);
  const qs = params.toString();
  return qs ? `?${qs}` : "?";
}

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; tipo?: string; tag?: string; q?: string; page?: string }>;
}) {
  const { v, tipo, tag, q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const filtrosAtuais = { v, tipo, tag, q };

  const filters: CrmFilters = {
    ownerId: v || undefined,
    contactType: tipo === "cliente" || tipo === "lead" ? tipo : undefined,
    tag: tag || undefined,
    search: q || undefined,
  };

  const [{ employees, tags }, { rows, totalCount, totalPages }] = await Promise.all([
    listCrmFilterOptions(),
    listCrmContacts(filters, page),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM da equipe"
        description="Todos os clientes e leads, de W1 ao último W cadastrado, num lugar só — inclusive o que entra automático pelo WhatsApp."
      />

      <div className="space-y-3">
        <nav className="barra-vidro">
          <Link href={hrefComFiltro(filtrosAtuais, { v: undefined, page: undefined })} className={!v ? "ativo" : ""}>
            Todas
          </Link>
          {employees.map((e) => (
            <Link key={e.id} href={hrefComFiltro(filtrosAtuais, { v: e.id, page: undefined })} className={v === e.id ? "ativo" : ""} title={e.full_name}>
              {rotulo(e.full_name)}
            </Link>
          ))}
        </nav>

        <nav className="barra-vidro">
          <Link href={hrefComFiltro(filtrosAtuais, { tipo: undefined, page: undefined })} className={!tipo ? "ativo" : ""}>
            Todos
          </Link>
          <Link href={hrefComFiltro(filtrosAtuais, { tipo: "cliente", page: undefined })} className={tipo === "cliente" ? "ativo" : ""}>
            Clientes
          </Link>
          <Link href={hrefComFiltro(filtrosAtuais, { tipo: "lead", page: undefined })} className={tipo === "lead" ? "ativo" : ""}>
            Leads
          </Link>
        </nav>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={hrefComFiltro(filtrosAtuais, { tag: undefined, page: undefined })}
              className={`rounded-full px-2.5 py-1 text-xs ${!tag ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted hover:text-foreground"}`}
            >
              Todas as tags
            </Link>
            {tags.map((t) => (
              <Link
                key={t}
                href={hrefComFiltro(filtrosAtuais, { tag: t, page: undefined })}
                className={`rounded-full px-2.5 py-1 text-xs ${tag === t ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted hover:text-foreground"}`}
              >
                {t}
              </Link>
            ))}
          </div>
        )}

        <form className="flex gap-2">
          {v && <input type="hidden" name="v" value={v} />}
          {tipo && <input type="hidden" name="tipo" value={tipo} />}
          {tag && <input type="hidden" name="tag" value={tag} />}
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome ou telefone…"
            className="w-full max-w-xs rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground"
          />
          <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-primary hover:bg-surface-2">
            Buscar
          </button>
          {q && (
            <Link href={hrefComFiltro(filtrosAtuais, { q: undefined, page: undefined })} className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground">
              Limpar
            </Link>
          )}
        </form>
      </div>

      <p className="text-xs text-muted">{totalCount} contato{totalCount === 1 ? "" : "s"} encontrado{totalCount === 1 ? "" : "s"}.</p>

      {rows.length === 0 ? (
        <div className="card-glass p-6 text-center text-sm text-muted">Nenhum contato com esses filtros.</div>
      ) : (
        <div className="space-y-3">
          {rows.map(({ contact, owner, notes }) => {
            const valor = contact.contact_type === "cliente" ? contact.last_purchase_value : contact.lead_interest_value;
            const ultimaNota = notes[0] ?? null;
            return (
              <div key={contact.id} className="card-glass p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-1">
                  <h3 className="font-semibold text-foreground">
                    {contact.name || contact.phone}
                    {contact.instagram_handle && <span className="ml-1 font-normal text-muted">@{contact.instagram_handle}</span>}
                  </h3>
                  <span className="text-xs text-muted">
                    {contact.contact_type === "cliente" ? "Cliente" : `Lead · ${contact.attempt_stage}ª tentativa`}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg border border-border bg-background p-2">
                    <p className="text-[10px] uppercase text-muted">Vendedora</p>
                    <p className="font-medium text-foreground">{owner?.full_name ?? "—"}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-2">
                    <p className="text-[10px] uppercase text-muted">Valor</p>
                    {valor != null ? (
                      <p className="font-semibold text-green-700 dark:text-green-400">{formatCurrency(valor)}</p>
                    ) : (
                      <p className="text-muted">—</p>
                    )}
                  </div>
                  <div className="rounded-lg border border-border bg-background p-2">
                    <p className="text-[10px] uppercase text-muted">Próximo contato</p>
                    <p className="font-medium text-foreground">{formatDate(contact.next_contact_date)}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-background p-2">
                    <p className="text-[10px] uppercase text-muted">Origem</p>
                    <p className="font-medium text-foreground">{origemLabel(contact.source)}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <a href={whatsapp(contact.phone)} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                    {contact.phone}
                  </a>
                  {contact.converted && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Convertido</span>}
                  {contact.tags.map((t) => (
                    <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
                      {t}
                    </span>
                  ))}
                </div>

                {ultimaNota && (
                  <p className="mt-2 text-xs text-muted">
                    <span className="font-medium text-foreground">{ultimaNota.author}:</span> {ultimaNota.content}
                    <span className="ml-1">({formatDateTime(ultimaNota.created_at)})</span>
                    {notes.length > 1 && <span className="ml-1">· +{notes.length - 1} nota{notes.length - 1 === 1 ? "" : "s"} anterior{notes.length - 1 === 1 ? "" : "es"}</span>}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center gap-1 pt-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={hrefComFiltro(filtrosAtuais, { page: p === 1 ? undefined : String(p) })}
              className={
                p === page
                  ? "rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground"
                  : "rounded-md border border-border px-3 py-1 text-xs text-muted hover:text-foreground"
              }
            >
              Página {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
