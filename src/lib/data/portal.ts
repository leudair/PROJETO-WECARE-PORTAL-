import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database, PortalResumo } from "@/lib/supabase/database.types";
import { todayInSaoPaulo } from "@/lib/date";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Expediente = Database["public"]["Tables"]["portal_expediente"]["Row"];
export type RelatorioDia = Database["public"]["Tables"]["portal_relatorio_dia"]["Row"];

// Mensagens em portugues para os codigos de retorno das funcoes do banco.
export const MENSAGEM_ERRO: Record<string, string> = {
  codigo_errado: "Código errado. Depois de 5 erros seguidos, ele trava por 15 minutos.",
  codigo_bloqueado: "Código travado por 15 minutos depois de 5 erros. Tente mais tarde.",
  codigo_invalido: "O código precisa ter de 4 a 8 números.",
  sem_codigo: "Você ainda não criou seu código de assinatura.",
  dia_nao_aberto: "O dia ainda não foi aberto.",
  dia_ja_fechado: "O dia de hoje já foi fechado e assinado.",
  relatorio_ja_assinado: "Esse relatório já foi assinado.",
  sem_permissao: "Sem permissão para isso.",
};

export function mensagemDeErro(codigo: string | null | undefined): string {
  if (!codigo) return "Não foi possível concluir. Tente novamente.";
  for (const chave of Object.keys(MENSAGEM_ERRO)) {
    if (codigo.includes(chave)) return MENSAGEM_ERRO[chave];
  }
  return "Não foi possível concluir. Tente novamente.";
}

// null = a funcao do banco nao respondeu (ex.: migration ainda nao aplicada).
// Nesse caso o painel NAO trava, para ninguem ficar sem acesso por erro.
export const temCodigo = cache(async (): Promise<boolean | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("portal_tem_codigo");
  if (error) return null;
  return Boolean(data);
});

export const expedienteDeHoje = cache(async (profileId: string): Promise<Expediente | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portal_expediente")
    .select("*")
    .eq("profile_id", profileId)
    .eq("dia", todayInSaoPaulo())
    .maybeSingle();
  return data;
});

export async function resumoVendedora(profileId: string, de: string, ate: string): Promise<PortalResumo | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("portal_resumo_vendedora", { p_profile: profileId, p_de: de, p_ate: ate });
  if (error) return null;
  return data;
}

export async function relatorioDeHoje(profileId: string): Promise<RelatorioDia | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portal_relatorio_dia")
    .select("*")
    .eq("profile_id", profileId)
    .eq("dia", todayInSaoPaulo())
    .maybeSingle();
  return data;
}

export async function relatoriosDaVendedora(profileId: string, limite = 30): Promise<RelatorioDia[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portal_relatorio_dia")
    .select("*")
    .eq("profile_id", profileId)
    .order("dia", { ascending: false })
    .limit(limite);
  return data ?? [];
}

export async function expedientesDaVendedora(profileId: string, limite = 30): Promise<Expediente[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("portal_expediente")
    .select("*")
    .eq("profile_id", profileId)
    .order("dia", { ascending: false })
    .limit(limite);
  return data ?? [];
}

export interface StatusEquipe {
  profile: Profile;
  expediente: Expediente | null;
  relatorio: RelatorioDia | null;
}

// Uma linha por funcionaria com o status de hoje (abriu, fechou, gerente assinou).
export async function statusDaEquipeHoje(): Promise<StatusEquipe[]> {
  const supabase = await createClient();
  const hoje = todayInSaoPaulo();
  const [{ data: perfis }, { data: expedientes }, { data: relatorios }] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "employee").order("full_name"),
    supabase.from("portal_expediente").select("*").eq("dia", hoje),
    supabase.from("portal_relatorio_dia").select("*").eq("dia", hoje),
  ]);
  return (perfis ?? []).map((profile) => ({
    profile,
    expediente: expedientes?.find((e) => e.profile_id === profile.id) ?? null,
    relatorio: relatorios?.find((r) => r.profile_id === profile.id) ?? null,
  }));
}

export async function relatoriosPendentesGerente(): Promise<(RelatorioDia & { nome: string })[]> {
  const supabase = await createClient();
  const [{ data: relatorios }, { data: perfis }] = await Promise.all([
    supabase
      .from("portal_relatorio_dia")
      .select("*")
      .is("gerente_assinado_em", null)
      .order("dia", { ascending: false })
      .limit(100),
    supabase.from("profiles").select("id, full_name"),
  ]);
  return (relatorios ?? []).map((r) => ({
    ...r,
    nome: perfis?.find((p) => p.id === r.profile_id)?.full_name ?? "—",
  }));
}

export function formatarHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
