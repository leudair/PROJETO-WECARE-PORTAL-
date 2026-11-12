import type { LembretesTelegram } from "@/lib/supabase/database.types";
import { StatCard } from "@/components/stat-card";
import { formatarHora } from "@/lib/data/portal";

function dataCurta(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
}

function situacao(item: LembretesTelegram["lista"][number]): { texto: string; classe: string } {
  if (item.resultado === "chamei") return { texto: `Chamou ${formatarHora(item.confirmado_em)}`, classe: "text-green-400" };
  if (item.resultado === "nao_consegui") return { texto: "Não conseguiu", classe: "text-yellow-400" };
  if (item.aberto_em) return { texto: `Abriu ${formatarHora(item.aberto_em)}, falta marcar`, classe: "text-sky-400" };
  if (item.status === "agendado") return { texto: "Na fila", classe: "text-muted" };
  return { texto: "Recebeu, não abriu", classe: "text-red-400" };
}

// Lembretes que chegam pelo Telegram (card com Abrir WhatsApp / Ja chamei).
export function TelegramLembretes({ dados, mostrarLista = false }: { dados: LembretesTelegram; mostrarLista?: boolean }) {
  const taxa = dados.recebidos > 0 ? Math.round((dados.chamados / dados.recebidos) * 100) : 0;
  return (
    <div className="card-glass space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-foreground">Clientes para chamar (Telegram)</h2>
        {!dados.no_telegram && (
          <span className="text-xs text-red-400">Ainda não cadastrada no bot do Telegram</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Recebidos" value={String(dados.recebidos)} subLabel={`Hoje ${dados.recebidos_hoje} · Na fila ${dados.na_fila}`} />
        <StatCard label="Abriram o WhatsApp" value={String(dados.abertos)} subLabel="Tocou em Abrir WhatsApp" />
        <StatCard
          label="Já chamei"
          value={String(dados.chamados)}
          subLabel={`${taxa}% dos recebidos · Hoje ${dados.chamados_hoje}`}
          variant={dados.chamados > 0 ? "positive" : "neutral"}
        />
        <StatCard
          label="Falta chamar"
          value={String(dados.sem_resposta)}
          subLabel={`Não conseguiu: ${dados.nao_conseguiu}`}
          variant={dados.sem_resposta > 0 ? "negative" : "neutral"}
        />
      </div>

      {mostrarLista && (
        dados.lista.length === 0 ? (
          <p className="text-sm text-muted">Nenhum card enviado nos últimos 30 dias.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <ul className="divide-y divide-border text-sm">
              {dados.lista.map((item) => {
                const s = situacao(item);
                return (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      {item.cliente_nome || "Cliente"}{" "}
                      <span className="text-xs text-muted">{item.cliente_telefone}</span>
                    </span>
                    <span className="text-xs text-muted">Recebeu {dataCurta(item.enviado_em)}</span>
                    <span className={`text-xs font-medium ${s.classe}`}>{s.texto}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )
      )}
    </div>
  );
}
