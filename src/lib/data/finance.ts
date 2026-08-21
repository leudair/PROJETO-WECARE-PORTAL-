import "server-only";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireFinance } from "./auth";

// Percentuais fixos do regime da empresa (Simples Nacional). Se a aliquota
// mudar de faixa um dia, so mexer aqui — o resto do calculo se ajusta sozinho.
export const TAX_RATE = 0.15; // imposto
export const COMMISSION_RATE = 0.025; // comissao
export const VARIABLE_RATE = 0.045; // demais custos variaveis (22% medio total - 15% - 2,5%)

export interface FinancialBreakdown {
  faturamento: number;
  custoOperacional: number;
  custoAnuncios: number;
  imposto: number;
  comissao: number;
  variavel: number;
  saldoOperacao: number;
  lucroLiquido: number;
}

export function computeFinancials(input: {
  faturamento: number;
  custoOperacional: number;
  custoAnuncios: number;
}): FinancialBreakdown {
  const imposto = input.faturamento * TAX_RATE;
  const comissao = input.faturamento * COMMISSION_RATE;
  const variavel = input.faturamento * VARIABLE_RATE;
  const saldoOperacao = input.faturamento - input.custoOperacional - imposto - comissao - variavel;
  const lucroLiquido = saldoOperacao - input.custoAnuncios;

  return {
    faturamento: input.faturamento,
    custoOperacional: input.custoOperacional,
    custoAnuncios: input.custoAnuncios,
    imposto,
    comissao,
    variavel,
    saldoOperacao,
    lucroLiquido,
  };
}

export async function listEmployeesForFinance() {
  await requireFinance();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "employee")
    .order("full_name", { ascending: true });
  if (error) throw error;
  return data;
}

export async function listFinancialEntries() {
  await requireFinance();
  const supabase = await createClient();

  const [{ data: entries, error: entriesError }, { data: profiles, error: profilesError }] = await Promise.all([
    supabase.from("financial_entries").select("*").order("week_start_date", { ascending: false }),
    supabase.from("profiles").select("id, full_name"),
  ]);

  if (entriesError) throw entriesError;
  if (profilesError) throw profilesError;

  const nameById = new Map(profiles.map((p) => [p.id, p.full_name]));

  return entries.map((entry) => ({
    entry,
    employeeName: nameById.get(entry.employee_id) ?? "—",
    breakdown: computeFinancials({
      faturamento: entry.faturamento,
      custoOperacional: entry.custo_operacional,
      custoAnuncios: entry.custo_anuncios,
    }),
  }));
}

export const FinancialEntrySchema = z.object({
  employeeId: z.uuid(),
  weekStartDate: z.string().date(),
  faturamento: z.coerce.number().min(0, "Valor não pode ser negativo."),
  custoOperacional: z.coerce.number().min(0, "Valor não pode ser negativo."),
  custoAnuncios: z.coerce.number().min(0, "Valor não pode ser negativo."),
});

export async function upsertFinancialEntry(input: z.infer<typeof FinancialEntrySchema>) {
  const profile = await requireFinance();
  const supabase = await createClient();

  const { error } = await supabase.from("financial_entries").upsert(
    {
      employee_id: input.employeeId,
      week_start_date: input.weekStartDate,
      faturamento: input.faturamento,
      custo_operacional: input.custoOperacional,
      custo_anuncios: input.custoAnuncios,
      created_by: profile.id,
    },
    { onConflict: "employee_id,week_start_date" }
  );

  if (error) throw error;
}
