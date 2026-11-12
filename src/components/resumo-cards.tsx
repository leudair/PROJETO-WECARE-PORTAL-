import type { PortalResumo } from "@/lib/supabase/database.types";
import { StatCard } from "@/components/stat-card";

function moeda(v: number) {
  return Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Numeros principais de uma vendedora num periodo (vendas, disparos, follow-ups, site).
export function ResumoCards({ resumo }: { resumo: PortalResumo }) {
  const vendasQtd = (resumo.vendas_portal_qtd ?? 0) + (resumo.site_vendas_qtd ?? 0);
  const vendasValor = Number(resumo.vendas_portal_valor ?? 0) + Number(resumo.site_vendas_valor ?? 0);
  const enviados = resumo.disparos_enviados ?? 0;
  const respondidos = resumo.disparos_respondidos ?? 0;
  const taxa = enviados > 0 ? Math.round((respondidos / enviados) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="Vendas"
        value={String(vendasQtd)}
        subLabel={`${moeda(vendasValor)} · Portal ${resumo.vendas_portal_qtd ?? 0} · Site ${resumo.site_vendas_qtd ?? 0}`}
        variant={vendasQtd > 0 ? "positive" : "neutral"}
      />
      <StatCard
        label="Ticket médio"
        value={vendasQtd > 0 ? moeda(vendasValor / vendasQtd) : "—"}
        subLabel={`Canceladas no site: ${resumo.site_cancelados ?? 0}`}
      />
      <StatCard
        label="Disparos"
        value={String(enviados)}
        subLabel={`Responderam ${respondidos} (${taxa}%) · Falharam ${resumo.disparos_falhados ?? 0}`}
        variant={(resumo.disparos_falhados ?? 0) > enviados ? "negative" : "neutral"}
      />
      <StatCard
        label="Follow-ups"
        value={String((resumo.lembretes_cadastrados ?? 0) + (resumo.followups_programados ?? 0))}
        subLabel={`Portal ${resumo.lembretes_cadastrados ?? 0} · Telegram ${resumo.followups_programados ?? 0} · Pendentes ${resumo.followups_pendentes ?? 0}`}
      />
      <StatCard label="Conversas no site" value={String(resumo.site_conversas ?? 0)} subLabel="Clientes que abriram o link dela" />
    </div>
  );
}
