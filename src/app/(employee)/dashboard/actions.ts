"use server";

import { revalidatePath } from "next/cache";
import { ContactInputSchema, createContact } from "@/lib/data/contacts";
import { markNoticeRead } from "@/lib/data/notices";

export async function dismissNoticeAction(noticeId: string) {
  await markNoticeRead(noticeId);
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
