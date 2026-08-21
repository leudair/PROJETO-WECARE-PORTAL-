"use server";

import { revalidatePath } from "next/cache";
import { CreateEmployeeSchema, createEmployee, deleteEmployee } from "@/lib/data/admin";
import { CreateNoticeSchema, createNotice } from "@/lib/data/notices";

export type CreateEmployeeState = { error?: string; success?: string } | undefined;

export async function createEmployeeAction(
  _state: CreateEmployeeState,
  formData: FormData
): Promise<CreateEmployeeState> {
  const parsed = CreateEmployeeSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    whatsappNumber: formData.get("whatsappNumber"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados invalidos." };
  }

  try {
    await createEmployee(parsed.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Nao foi possivel criar o funcionario.";
    return { error: message };
  }

  revalidatePath("/admin/employees");
  return { success: "Conta criada. Compartilhe o email e a senha temporária com a pessoa." };
}

export type SendNoticeState = { error?: string; success?: string } | undefined;

export async function sendNoticeAction(_state: SendNoticeState, formData: FormData): Promise<SendNoticeState> {
  const parsed = CreateNoticeSchema.safeParse({
    employeeId: formData.get("employeeId"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados invalidos." };
  }

  try {
    await createNotice(parsed.data);
  } catch {
    return { error: "Nao foi possivel enviar o aviso." };
  }

  return { success: "Aviso enviado." };
}

export type DeleteEmployeeState = { error?: string } | undefined;

export async function deleteEmployeeAction(employeeId: string): Promise<DeleteEmployeeState> {
  try {
    await deleteEmployee(employeeId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Não foi possível excluir.";
    return { error: message };
  }

  revalidatePath("/admin/employees");
  revalidatePath("/admin");
}
