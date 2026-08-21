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
    redirect("/login");
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
