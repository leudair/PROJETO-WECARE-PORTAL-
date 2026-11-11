import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/supabase/env";
import { supabaseServiceRoleKey } from "@/lib/supabase/service-role-key";
import { getEmployeeWCode } from "@/lib/employee-site";

// wa_config e wa_funcionarios sao do agente de WhatsApp/Telegram — mesmo
// projeto Supabase do Portal, mas fora do schema tipado em database.types.ts.
// Por isso um client sem o generic <Database>, só pra essa ponte entre os
// dois sistemas (o elo e' sempre o codigo W, nunca o nome — ver employee-site.ts).
function createCrossSystemClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getTelegramBotToken(): Promise<string> {
  const admin = createCrossSystemClient();
  const { data, error } = await admin
    .from("wa_config")
    .select("valor")
    .eq("chave", "telegram_bot_token")
    .maybeSingle();
  if (error) throw error;
  if (!data?.valor) throw new Error("telegram_bot_token nao configurado em wa_config");
  return data.valor;
}

export async function getEmployeeTelegramChatId(fullName: string): Promise<number | null> {
  const code = getEmployeeWCode(fullName);
  if (!code) return null;

  const admin = createCrossSystemClient();
  const { data, error } = await admin
    .from("wa_funcionarios")
    .select("telegram_chat_id")
    .eq("codigo", code.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data?.telegram_chat_id ?? null;
}

export async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const token = await getTelegramBotToken();
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  if (!response.ok) {
    throw new Error(`Telegram ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }
}
