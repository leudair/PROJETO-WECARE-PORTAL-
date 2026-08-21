"use server";

import { revalidatePath } from "next/cache";
import { FinancialEntrySchema, upsertFinancialEntry } from "@/lib/data/finance";

export type SaveEntryState = { error?: string; success?: string } | undefined;

export async function saveFinancialEntryAction(
  _state: SaveEntryState,
  formData: FormData
): Promise<SaveEntryState> {
  const parsed = FinancialEntrySchema.safeParse({
    employeeId: formData.get("employeeId"),
    weekStartDate: formData.get("weekStartDate"),
    faturamento: formData.get("faturamento"),
    custoOperacional: formData.get("custoOperacional"),
    custoAnuncios: formData.get("custoAnuncios"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    await upsertFinancialEntry(parsed.data);
  } catch {
    return { error: "Não foi possível salvar." };
  }

  revalidatePath("/financeiro");
  return { success: "Lançamento salvo." };
}
