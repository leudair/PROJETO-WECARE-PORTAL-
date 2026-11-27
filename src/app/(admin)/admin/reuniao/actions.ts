"use server";

import { requireAdmin } from "@/lib/data/auth";
import { createClient } from "@/lib/supabase/server";

export type ReuniaoItem = {
  id: string;
  titulo: string;
  data: string; // "YYYY-MM-DD"
  hora: string | null;
  observacao: string | null;
  status: string;
  origem: string;
  ownerName: string;
  contactName: string | null;
};

export type ReunioesDoMes = { days: Record<string, ReuniaoItem[]>; total: number };

// Reunioes do mes (monthKey "YYYY-MM"), agrupadas por dia — alimenta o
// calendario do painel "Reunião". Hoje so existem reunioes cadastradas a mao;
// quando a IA dos anuncios comecar a marcar reuniao sozinha, a ideia e que ela
// grave direto nessa mesma tabela (ver campo "origem") e apareca aqui.
export async function listReunioesDoMes(monthKey: string): Promise<ReunioesDoMes> {
  await requireAdmin();
  const supabase = await createClient();

  const [year, month] = monthKey.split("-").map(Number);
  const from = `${monthKey}-01`;
  const to = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10); // dia 1 do mes seguinte (exclusivo)

  const [{ data: reunioes, error: reunioesError }, { data: profiles, error: profilesError }, { data: contacts, error: contactsError }] =
    await Promise.all([
      supabase.from("reunioes").select("*").gte("data", from).lt("data", to).order("hora", { ascending: true, nullsFirst: false }),
      supabase.from("profiles").select("id, full_name"),
      supabase.from("contacts").select("id, name"),
    ]);

  if (reunioesError) throw reunioesError;
  if (profilesError) throw profilesError;
  if (contactsError) throw contactsError;

  const profileById = new Map(profiles.map((p) => [p.id, p.full_name]));
  const contactById = new Map(contacts.map((c) => [c.id, c.name]));

  const days: Record<string, ReuniaoItem[]> = {};
  for (const r of reunioes) {
    const item: ReuniaoItem = {
      id: r.id,
      titulo: r.titulo,
      data: r.data,
      hora: r.hora,
      observacao: r.observacao,
      status: r.status,
      origem: r.origem,
      ownerName: profileById.get(r.owner_id) ?? "—",
      contactName: r.contact_id ? (contactById.get(r.contact_id) ?? null) : null,
    };
    (days[r.data] ??= []).push(item);
  }

  return { days, total: reunioes.length };
}

export async function createReuniao(input: { titulo: string; data: string; hora: string | null; observacao: string | null }) {
  const profile = await requireAdmin();
  if (!input.titulo.trim()) throw new Error("Dá um título pra reunião (nome do cliente/assunto).");
  if (!input.data) throw new Error("Escolhe o dia da reunião.");

  const supabase = await createClient();
  const { error } = await supabase.from("reunioes").insert({
    owner_id: profile.id,
    titulo: input.titulo.trim(),
    data: input.data,
    hora: input.hora || null,
    observacao: input.observacao?.trim() || null,
    origem: "manual",
  });
  if (error) throw error;
}

export async function deleteReuniao(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("reunioes").delete().eq("id", id);
  if (error) throw error;
}
