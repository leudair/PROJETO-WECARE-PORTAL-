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
  })
  .refine((data) => data.contactType === "cliente" || data.attemptStage !== undefined, {
    message: "Selecione a tentativa (2ª a 6ª) para um lead.",
    path: ["attemptStage"],
  });

export type ContactInput = z.infer<typeof ContactInputSchema>;

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
    last_purchase_value: input.lastPurchaseValue ?? null,
  });

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
