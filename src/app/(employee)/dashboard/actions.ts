"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { ContactInputSchema, createContact, markConverted, updatePurchaseValue } from "@/lib/data/contacts";
import { markNoticeRead } from "@/lib/data/notices";

export async function dismissNoticeAction(noticeId: string) {
  await markNoticeRead(noticeId);
  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

const SaleValueSchema = z.coerce.number().min(0, "Valor não pode ser negativo.");

const MarkConvertedSchema = z.object({
  saleValue: SaleValueSchema,
  saleDate: z.string().date(),
});

export type MarkConvertedState = { error?: string } | undefined;

export async function markConvertedAction(
  contactId: string,
  _state: MarkConvertedState,
  formData: FormData
): Promise<MarkConvertedState> {
  const parsed = MarkConvertedSchema.safeParse({
    saleValue: formData.get("saleValue"),
    saleDate: formData.get("saleDate"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    await markConverted(contactId, parsed.data.saleValue, parsed.data.saleDate);
  } catch {
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

export type UpdatePurchaseValueState = { error?: string } | undefined;

export async function updatePurchaseValueAction(
  contactId: string,
  _state: UpdatePurchaseValueState,
  formData: FormData
): Promise<UpdatePurchaseValueState> {
  const parsed = SaleValueSchema.safeParse(formData.get("value"));

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Valor inválido." };
  }

  try {
    await updatePurchaseValue(contactId, parsed.data);
  } catch {
    return { error: "Não foi possível salvar. Tente novamente." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");
}

export type AddContactState = { error?: string } | undefined;

export async function addContact(_state: AddContactState, formData: FormData): Promise<AddContactState> {
  const parsed = ContactInputSchema.safeParse({
    name: formData.get("name"),
    instagramHandle: formData.get("instagramHandle"),
    phone: formData.get("phone"),
    contactType: formData.get("contactType"),
    attemptStage: formData.get("attemptStage") || undefined,
    nextContactDate: formData.get("nextContactDate"),
    lastPurchaseValue: formData.get("lastPurchaseValue") || undefined,
    leadInterestValue: formData.get("leadInterestValue") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados invalidos." };
  }

  try {
    await createContact(parsed.data);
  } catch {
    return { error: "Nao foi possivel salvar. Tente novamente." };
  }

  revalidatePath("/dashboard");
}
