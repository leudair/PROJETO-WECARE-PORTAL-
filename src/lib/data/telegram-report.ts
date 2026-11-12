import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/supabase/env";
import { supabaseServiceRoleKey } from "@/lib/supabase/service-role-key";
import { requireAdmin, requireProfile } from "./auth";
import { todayInSaoPaulo } from "@/lib/date";

// Relatorio dos lembretes que o bot do Telegram (@agenciawecare_bot) mandou
// pra cada vendedora. Os dados vem das views telegram_relatorio_* (migration
// 0011), que so a chave de servico le — por isso o filtro de quem pode ver o
// que fica aqui no servidor: admin/gerente ve todas, funcionaria so a dela
// (casada pelo WhatsApp do perfil com o telefone em wa_funcionarios).

export interface TelegramReminderRow {
  id: number;
  vendedora_codigo: string | null;
  vendedora: string | null;
  vendedora_telefone: string | null;
  cliente_nome: string | null;
  cliente_telefone: string;
  cliente_instagram: string | null;
  ultima_compra_valor: number | null;
  valor_sugerido: number | null;
  enviado_em: string;
  venda_depois_valor: number | null;
  venda_depois_em: string | null;
  comprou_depois: boolean;
}

export interface TelegramSellerSummary {
  key: string;
  codigo: string | null;
  nome: string | null;
  enviados: number;
  compraram: number;
  totalVendido: number;
  somaSugerido: number;
}

function serviceClient() {
  return createSupabaseClient(supabaseUrl, supabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const last8 = (tel: string | null | undefined) => (tel ?? "").replace(/\D/g, "").slice(-8);

export function normalizeMonth(value: string | undefined): string {
  if (value && /^\d{4}-\d{2}$/.test(value)) return value;
  return todayInSaoPaulo().slice(0, 7);
}

function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  // meia-noite de Sao Paulo (UTC-3) no 1o dia do mes e do mes seguinte
  const start = new Date(Date.UTC(y, m - 1, 1, 3)).toISOString();
  const end = new Date(Date.UTC(y, m, 1, 3)).toISOString();
  return { start, end };
}

async function fetchRows(month: string): Promise<TelegramReminderRow[]> {
  const { start, end } = monthRange(month);
  const { data, error } = await serviceClient()
    .from("telegram_relatorio_lembretes")
    .select("*")
    .gte("enviado_em", start)
    .lt("enviado_em", end)
    .order("enviado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    ultima_compra_valor: r.ultima_compra_valor == null ? null : Number(r.ultima_compra_valor),
    valor_sugerido: r.valor_sugerido == null ? null : Number(r.valor_sugerido),
    venda_depois_valor: r.venda_depois_valor == null ? null : Number(r.venda_depois_valor),
  })) as TelegramReminderRow[];
}

export function summarize(rows: TelegramReminderRow[]): TelegramSellerSummary[] {
  const map = new Map<string, TelegramSellerSummary>();
  for (const r of rows) {
    const key = r.vendedora_codigo ?? r.vendedora ?? "?";
    const s = map.get(key) ?? { key, codigo: r.vendedora_codigo, nome: r.vendedora, enviados: 0, compraram: 0, totalVendido: 0, somaSugerido: 0 };
    s.enviados += 1;
    if (r.comprou_depois) {
      s.compraram += 1;
      s.totalVendido += r.venda_depois_valor ?? 0;
    }
    s.somaSugerido += r.valor_sugerido ?? 0;
    map.set(key, s);
  }
  return [...map.values()].sort((a, b) => b.totalVendido - a.totalVendido || b.enviados - a.enviados);
}

export async function getAdminTelegramReport(month: string, seller?: string) {
  await requireAdmin();
  const rows = await fetchRows(month);
  const summary = summarize(rows);
  const filtered = seller ? rows.filter((r) => (r.vendedora_codigo ?? r.vendedora ?? "?") === seller) : rows;
  return { rows: filtered, summary };
}

export async function getMyTelegramReport(month: string) {
  const profile = await requireProfile();
  const mine = last8(profile.whatsapp_number);
  const rows = mine ? (await fetchRows(month)).filter((r) => last8(r.vendedora_telefone) === mine) : [];
  return { rows, summary: summarize(rows) };
}
