"use server";

import { revalidatePath } from "next/cache";
import { updateTemplate } from "@/lib/data/admin";

export async function saveTemplateAction(formData: FormData) {
  const stage = Number(formData.get("stage"));
  const body = String(formData.get("body") ?? "");

  if (!Number.isInteger(stage) || stage < 2 || stage > 6) {
    throw new Error("Estagio invalido.");
  }

  await updateTemplate(stage, body);
  revalidatePath("/admin/templates");
  revalidatePath("/dashboard/templates");
}
