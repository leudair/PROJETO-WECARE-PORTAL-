import "server-only";
import { randomInt } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export { todayInSaoPaulo } from "@/lib/date";

// Estas funcoes usam o client com service_role (ignora RLS) porque rodam
// fora do contexto de um usuario logado: cron de disparo e webhook da Z-API.
// Nunca importar este modulo em codigo acionado por uma requisicao de usuario.

// Tempo minimo plausivel pra realmente ter contatado 1 cliente. Usado tanto
// pra confirmacao individual (1 contato) quanto pra "TUDO" (N contatos) —
// ver flagged_suspicious em recordConfirmation().
export const SECONDS_PER_CONTACT_MIN = 8;

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I/L, pra nao confundir na hora de digitar

// randomInt (node:crypto) em vez de Math.random(): CSPRNG, nao apenas um
// gerador estatistico (CWE-338). Mesmo formato/alfabeto de antes.
export function generateConfirmationCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

export async function getDueContacts(dateStr: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contacts")
    .select("*, profiles!contacts_owner_id_fkey(whatsapp_number, full_name)")
    .eq("status", "pending")
    .lte("next_contact_date", dateStr);

  if (error) throw error;
  return data;
}

export async function hasDispatchToday(contactId: string, dateStr: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("reminder_dispatches")
    .select("id")
    .eq("contact_id", contactId)
    .eq("scheduled_for", dateStr)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function getTemplateBody(stage: number): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("message_templates")
    .select("body")
    .eq("stage", stage)
    .maybeSingle();

  if (error) throw error;
  return data?.body ?? "";
}

export async function recordDispatch(input: {
  contactId: string;
  employeeId: string;
  scheduledFor: string;
  zapiMessageId: string | null;
  status: "sent" | "failed";
  confirmationCode: string | null;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("reminder_dispatches").insert({
    contact_id: input.contactId,
    employee_id: input.employeeId,
    scheduled_for: input.scheduledFor,
    sent_at: input.status === "sent" ? new Date().toISOString() : null,
    zapi_message_id: input.zapiMessageId,
    status: input.status,
    confirmation_code: input.confirmationCode,
  });

  if (error) throw error;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function buildReminderText(
  contact: {
    name: string;
    instagram_handle: string | null;
    phone: string;
    contact_type: "cliente" | "lead";
    attempt_stage: number | null;
    last_purchase_value: number | null;
  },
  templateBody: string | null,
  confirmationCode: string
) {
  const handle = contact.instagram_handle ? ` (@${contact.instagram_handle})` : "";
  const header = `🔔 Lembrete: entrar em contato com ${contact.name}${handle}\nTelefone: ${contact.phone}`;
  const confirmFooter = `\n\n✅ Depois de falar com o cliente, responda aqui com o código: ${confirmationCode}\n(ou responda "TUDO" se já concluiu todos os contatos de hoje)`;

  if (contact.contact_type === "cliente") {
    const purchaseLine =
      contact.last_purchase_value != null
        ? `\nÚltima compra: ${formatCurrency(contact.last_purchase_value)} — considere oferecer um pacote acima desse valor.`
        : "";
    return `${header}${purchaseLine}\n\nCliente já convertido — mande uma mensagem humanizada para reengajar (ex: "Oi, tudo bem? Passando pra saber como você está.").${confirmFooter}`;
  }

  const stageLabel = contact.attempt_stage ? `${contact.attempt_stage}ª tentativa` : "Lead";
  const suggestion = templateBody?.trim()
    ? `\n\nSugestão de mensagem (copie e cole):\n${templateBody}`
    : "\n\nNenhum texto-modelo cadastrado para essa tentativa ainda.";

  return `${header}\n${stageLabel}${suggestion}${confirmFooter}`;
}
