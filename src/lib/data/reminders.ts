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
    .lte("next_contact_date", dateStr)
    // Ordem deterministica, mais atrasado primeiro. Sem isso o Postgres
    // devolve em ordem arbitraria e, como cada execucao manda um lote, um
    // contato atrasado pode ficar sendo preterido por dias seguidos.
    .order("next_contact_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export interface TodayDispatchState {
  /** Contatos que ja tem disparo registrado hoje, em qualquer status — inclui
   *  a reserva feita por uma execucao concorrente que ainda esta enviando. */
  contactIds: Set<string>;
  /** Quantos lembretes cada funcionario ja recebeu hoje. */
  countByEmployee: Map<string, number>;
}

// Uma query por rodada em vez de uma por contato.
export async function getTodayDispatchState(dateStr: string): Promise<TodayDispatchState> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("reminder_dispatches")
    .select("contact_id, employee_id")
    .eq("scheduled_for", dateStr);

  if (error) throw error;

  const contactIds = new Set<string>();
  const countByEmployee = new Map<string, number>();

  for (const row of data ?? []) {
    contactIds.add(row.contact_id);
    countByEmployee.set(row.employee_id, (countByEmployee.get(row.employee_id) ?? 0) + 1);
  }

  return { contactIds, countByEmployee };
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

// Violacao de unique constraint no Postgres.
const UNIQUE_VIOLATION = "23505";

export interface DispatchClaim {
  dispatchId: string;
  confirmationCode: string;
}

// Reserva o disparo ANTES de mandar a mensagem. O unique index
// (contact_id, scheduled_for) e' o que garante que duas execucoes
// simultaneas do cron nao mandem o mesmo lembrete duas vezes: quem perder a
// corrida recebe 23505 aqui e devolve null, sem ter enviado nada. Enviar
// primeiro e gravar depois (como era antes) deixava o WhatsApp sair duas
// vezes, porque o indice so barrava a segunda LINHA, nao a segunda mensagem.
//
// Devolve null quando o contato ja foi reservado por outra execucao.
export async function claimDispatch(input: {
  contactId: string;
  employeeId: string;
  scheduledFor: string;
}): Promise<DispatchClaim | null> {
  const admin = createAdminClient();

  // O codigo de confirmacao tambem tem unique index. Colisao e' improvavel
  // (31^6), mas se acontecer vale tentar outro em vez de derrubar o disparo.
  for (let attempt = 0; attempt < 5; attempt++) {
    const confirmationCode = generateConfirmationCode();

    const { data, error } = await admin
      .from("reminder_dispatches")
      .insert({
        contact_id: input.contactId,
        employee_id: input.employeeId,
        scheduled_for: input.scheduledFor,
        status: "scheduled",
        confirmation_code: confirmationCode,
      })
      .select("id")
      .single();

    if (!error) {
      return { dispatchId: data.id, confirmationCode };
    }

    if (error.code !== UNIQUE_VIOLATION) throw error;

    // Foi o indice de (contact_id, scheduled_for)? Entao outra execucao pegou
    // esse contato e nao ha o que fazer. Se foi o do codigo, tenta de novo.
    if (!error.message.includes("confirmation_code")) return null;
  }

  throw new Error(
    `Nao foi possivel gerar um codigo de confirmacao livre para o contato ${input.contactId}.`
  );
}

export async function markDispatchSent(dispatchId: string, zapiMessageId: string | null) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("reminder_dispatches")
    .update({ status: "sent", sent_at: new Date().toISOString(), zapi_message_id: zapiMessageId })
    .eq("id", dispatchId);

  if (error) throw error;
}

// O codigo de confirmacao e' zerado junto: a mensagem nunca chegou, entao
// ninguem pode confirmar por ele, e deixa-lo ocupando o unique index so
// aumentaria a chance de colisao depois.
export async function markDispatchFailed(dispatchId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("reminder_dispatches")
    .update({ status: "failed", confirmation_code: null })
    .eq("id", dispatchId);

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
