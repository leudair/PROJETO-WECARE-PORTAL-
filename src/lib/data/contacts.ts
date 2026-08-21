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
  await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("contacts")
    .update({
      converted: true,
      converted_at: new Date(`${saleDate}T12:00:00`).toISOString(),
      status: "done",
      last_purchase_value: saleValue,
    })
    .eq("id", contactId);

  if (error) throw error;
}

// Corrige o valor depois de salvo — cliente ou lead ja convertido. Cobre o
// caso do lead salvo com o padrao de R$50 que depois fecha por outro valor.
export async function updatePurchaseValue(contactId: string, value: number) {
  await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("contacts")
    .update({ last_purchase_value: value })
    .eq("id", contactId);

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
