"use server";

import { revalidatePath } from "next/cache";
import { MonthlyRevenueEntrySchema, upsertMonthlyRevenueEntry } from "@/lib/data/finance";

export type SaveMonthlyEntryState = { error?: string; success?: string } | undefined;

export async function saveMonthlyRevenueEntryAction(
  _state: SaveMonthlyEntryState,
  formData: FormData
): Promise<SaveMonthlyEntryState> {
  const parsed = MonthlyRevenueEntrySchema.safeParse({
    employeeId: formData.get("employeeId"),
    monthStartDate: formData.get("monthStartDate"),
    faturamento: formData.get("faturamento"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  try {
    await upsertMonthlyRevenueEntry(parsed.data);
  } catch {
    return { error: "Não foi possível salvar." };
  }

  revalidatePath("/financeiro/mensal");
  return { success: "Faturamento mensal salvo." };
}
