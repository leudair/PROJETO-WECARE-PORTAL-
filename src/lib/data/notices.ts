import "server-only";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, requireProfile } from "./auth";

export async function listOwnUnreadNotices() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("employee_notices")
    .select("*")
    .eq("employee_id", profile.id)
    .is("read_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function markNoticeRead(noticeId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("employee_notices")
    .update({ read_at: new Date().toISOString() })
    .eq("id", noticeId)
    .eq("employee_id", profile.id);

  if (error) throw error;
}

export const CreateNoticeSchema = z.object({
  employeeId: z.uuid(),
  message: z.string().trim().min(1, "Escreva uma mensagem.").max(500, "Mensagem muito longa."),
});

export async function createNotice(input: z.infer<typeof CreateNoticeSchema>) {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("employee_notices").insert({
    employee_id: input.employeeId,
    created_by: profile.id,
    message: input.message,
  });

  if (error) throw error;
}
