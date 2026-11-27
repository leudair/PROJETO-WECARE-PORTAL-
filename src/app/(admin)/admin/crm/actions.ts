"use server";

import { requireAdmin } from "@/lib/data/auth";
import { createClient } from "@/lib/supabase/server";
import { supabaseUrl } from "@/lib/supabase/env";

export type TelegramBlastItem = { name: string; phone: string; value: number | null };

const brl = (v: number) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Dispara a lista filtrada de um funil pro Telegram da vendedora dona dele —
// mesmo bot já usado pelos lembretes do Portal (telegram_bot_token no Supabase).
export async function sendCrmTelegramBlast(ownerId: string, columnLabel: string, items: TelegramBlastItem[]) {
  await requireAdmin();
  if (!items.length) throw new Error("Nenhum contato nessa seleção.");

  const supabase = await createClient();
  const { data: func, error } = await supabase
    .from("wa_funcionarios")
    .select("telegram_chat_id, nome")
    .eq("profile_id", ownerId)
    .maybeSingle();
  if (error) throw error;
  if (!func?.telegram_chat_id) {
    throw new Error("Essa vendedora ainda não tem o Telegram cadastrado (wa_funcionarios.telegram_chat_id).");
  }

  const linhas = items
    .map((i) => `• <b>${esc(i.name || i.phone)}</b> — ${esc(i.phone)}${i.value != null ? ` (${brl(i.value)})` : ""}`)
    .join("\n");
  const texto = `📋 <b>${esc(columnLabel)}</b>\n\n${linhas}\n\nTotal: ${items.length}`;

  const token = process.env.WA_WEBHOOK_TOKEN;
  if (!token) throw new Error("WA_WEBHOOK_TOKEN não configurado no Portal.");

  const r = await fetch(`${supabaseUrl}/functions/v1/crm-telegram-disparo?t=${token}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: func.telegram_chat_id, texto }),
  });
  if (!r.ok) throw new Error("Falha ao enviar pro Telegram: " + (await r.text()).slice(0, 300));

  return { enviados: items.length, vendedora: func.nome };
}
