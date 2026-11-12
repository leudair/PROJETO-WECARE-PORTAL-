"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireProfile } from "@/lib/data/auth";
import { mensagemDeErro } from "@/lib/data/portal";

export type AssinaturaState = { error?: string; success?: string } | undefined;

const Codigo = z.string().regex(/^\d{4,8}$/, "O código precisa ter de 4 a 8 números.");

function ok(mensagem: string): AssinaturaState {
  revalidatePath("/", "layout");
  return { success: mensagem };
}

export async function definirCodigoAction(_s: AssinaturaState, formData: FormData): Promise<AssinaturaState> {
  await requireProfile();
  const novo = Codigo.safeParse(formData.get("novo"));
  if (!novo.success) return { error: novo.error.issues[0]?.message };
  if (formData.get("confirmar") !== novo.data) return { error: "Os dois códigos não são iguais." };
  const atual = (formData.get("atual") as string | null) || null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("portal_definir_codigo", { p_novo: novo.data, p_atual: atual });
  if (error || data !== "ok") return { error: mensagemDeErro(error?.message ?? data) };
  return ok("Código salvo. Guarde só com você.");
}

export async function abrirDiaAction(_s: AssinaturaState, formData: FormData): Promise<AssinaturaState> {
  await requireProfile();
  const codigo = Codigo.safeParse(formData.get("codigo"));
  if (!codigo.success) return { error: codigo.error.issues[0]?.message };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("portal_abrir_dia", { p_codigo: codigo.data });
  if (error || data !== "ok") return { error: mensagemDeErro(error?.message ?? data) };
  return ok("Dia aberto. Bom trabalho!");
}

export async function fecharDiaAction(_s: AssinaturaState, formData: FormData): Promise<AssinaturaState> {
  await requireProfile();
  const codigo = Codigo.safeParse(formData.get("codigo"));
  if (!codigo.success) return { error: codigo.error.issues[0]?.message };
  const observacao = String(formData.get("observacao") ?? "").slice(0, 2000);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("portal_fechar_dia", { p_codigo: codigo.data, p_observacao: observacao });
  if (error || data !== "ok") return { error: mensagemDeErro(error?.message ?? data) };
  return ok("Dia fechado e assinado. Até amanhã!");
}

export async function gerenteAssinarAction(_s: AssinaturaState, formData: FormData): Promise<AssinaturaState> {
  await requireAdmin();
  const codigo = Codigo.safeParse(formData.get("codigo"));
  if (!codigo.success) return { error: codigo.error.issues[0]?.message };
  const relatorio = Number(formData.get("relatorio"));
  if (!Number.isInteger(relatorio) || relatorio <= 0) return { error: "Relatório inválido." };
  const observacao = String(formData.get("observacao") ?? "").slice(0, 2000);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("portal_gerente_assinar", {
    p_relatorio: relatorio,
    p_codigo: codigo.data,
    p_observacao: observacao,
  });
  if (error || data !== "ok") return { error: mensagemDeErro(error?.message ?? data) };
  return ok("Relatório assinado.");
}
