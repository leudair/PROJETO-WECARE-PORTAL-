import "server-only";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "./auth";

// E.164: + seguido de 8 a 15 digitos. Cobre numeros do Brasil e do exterior
// (ex.: clientes dos EUA), que o funcionario precisa digitar com codigo do pais.
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "Use o formato internacional, ex: +5511999999999");

export const ContactInputSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome do cliente."),
    instagramHandle: z
      .string()
      .trim()
      .transform((v) => v.replace(/^@/, ""))
      .optional()
      .or(z.literal("").transform(() => undefined)),
    phone: phoneSchema,
    contactType: z.enum(["cliente", "lead"]),
    attemptStage: z.coerce.number().int().min(2).max(6).optional(),
    nextContactDate: z.string().date(),
    lastPurchaseValue: z.coerce.number().min(0, "Valor não pode ser negativo.").optional(),
    leadInterestValue: z.coerce.number().min(0, "Valor não pode ser negativo.").optional(),
  })
  .refine((data) => data.contactType === "cliente" || data.attemptStage !== undefined, {
    message: "Selecione a tentativa (2ª a 6ª) para um lead.",
    path: ["attemptStage"],
  });

export type ContactInput = z.infer<typeof ContactInputSchema>;

// Valor assumido de "dinheiro na mesa" quando o lead nao demonstrou
// interesse por um valor especifico — ver DAL de admin (dinheiro na mesa).
export const DEFAULT_LEAD_INTEREST_VALUE = 50;

export async function listOwnContacts() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("owner_id", profile.id)
    .order("next_contact_date", { ascending: true });

  if (error) throw error;
  return data;
}

// agrupa "Meus lembretes" por data — evita uma lista unica gigante quando o
// funcionario tem muitos contatos cadastrados. O funcionario clica no dia
// e ve so os lembretes daquela data.
export async function listOwnContactDateSummaries() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contacts")
    .select("next_contact_date, contact_type")
    .eq("owner_id", profile.id)
    .order("next_contact_date", { ascending: true });

  if (error) throw error;

  const statsByDate = new Map<string, { total: number; leads: number; clientes: number }>();
  for (const contact of data) {
    const current = statsByDate.get(contact.next_contact_date) ?? { total: 0, leads: 0, clientes: 0 };
    current.total += 1;
    if (contact.contact_type === "lead") current.leads += 1;
    else current.clientes += 1;
    statsByDate.set(contact.next_contact_date, current);
  }

  return Array.from(statsByDate.entries())
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function listOwnContactsByDate(date: string) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("owner_id", profile.id)
    .eq("next_contact_date", date)
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createContact(input: ContactInput) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.from("contacts").insert({
    owner_id: profile.id,
    name: input.name,
    instagram_handle: input.instagramHandle ?? null,
    phone: input.phone,
    contact_type: input.contactType,
    attempt_stage: input.contactType === "lead" ? input.attemptStage ?? null : null,
    next_contact_date: input.nextContactDate,
    last_purchase_value: input.contactType === "cliente" ? input.lastPurchaseValue ?? null : null,
    lead_interest_value:
      input.contactType === "lead" ? input.leadInterestValue ?? DEFAULT_LEAD_INTEREST_VALUE : null,
  });

  if (error) throw error;
}

// saleDate e' a data em que a venda de fato aconteceu (o funcionario escolhe
// — pode ser hoje ou um dia anterior), nao a data em que o registro foi
// marcado no sistema. Isso e' o que decide em qual semana essa venda cai.
export async function markConverted(contactId: string, saleValue: number, saleDate: string) {
  const profile = await requireProfile();
  const supabase = await createClient();

  // owner_id no filtro e' defesa em profundidade — a RLS (contacts_owner_update)
  // ja bloqueia update de contato de outro dono, mas filtrar aqui tambem evita
  // depender exclusivamente da policy do banco pra essa garantia.
  const { error } = await supabase
    .from("contacts")
    .update({
      converted: true,
      converted_at: new Date(`${saleDate}T12:00:00`).toISOString(),
      status: "done",
      last_purchase_value: saleValue,
    })
    .eq("id", contactId)
    .eq("owner_id", profile.id);

  if (error) throw error;
}

// Corrige o valor depois de salvo — cliente ou lead ja convertido. Cobre o
// caso do lead salvo com o padrao de R$50 que depois fecha por outro valor.
export async function updatePurchaseValue(contactId: string, value: number) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("contacts")
    .update({ last_purchase_value: value })
    .eq("id", contactId)
    .eq("owner_id", profile.id);

  if (error) throw error;
}

export async function listTemplates() {
  await requireProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .order("stage", { ascending: true });

  if (error) throw error;
  return data;
}
