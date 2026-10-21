import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// cache() garante uma unica consulta por render, mesmo chamada em
// varios Server Components/Actions na mesma requisicao.
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
});

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    // Sessao valida (ex: link de redefinicao/magic link) mas sem linha em
    // profiles. Nao pode redirecionar pra /login aqui: como o usuario
    // continua autenticado, o proxy bate ele de volta pra "/" por /login
    // estar em PUBLIC_PATHS — e aqui em requireProfile() de novo, num loop
    // infinito de redirecionamento. /sem-perfil fica fora de PUBLIC_PATHS,
    // entao renderiza normalmente mesmo com sessao ativa.
    redirect("/sem-perfil");
  }
  return profile;
}

// Admin (CEO) e manager (gerente) tem o mesmo nivel de acesso ao painel hoje.
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "admin" && profile.role !== "manager") {
    redirect("/");
  }
  return profile;
}

// Financeiro so enxerga o painel financeiro — admin/manager tambem tem acesso
// a ele, alem do resto que ja podiam ver.
export async function requireFinance(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "admin" && profile.role !== "manager" && profile.role !== "financeiro") {
    redirect("/");
  }
  return profile;
}
