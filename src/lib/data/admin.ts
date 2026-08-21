import "server-only";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "./auth";
import { todayInSaoPaulo } from "@/lib/date";
import { DEFAULT_LEAD_INTEREST_VALUE } from "./contacts";

export type SummaryPeriod = "today" | "7d" | "all";

// a partir de quantos reenvios seguidos sem resposta um contato fica
// destacado como "esfriando" na Visao Geral
export const UNANSWERED_STREAK_ALERT = 3;

// filtra pela data PRETENDIDA do lembrete (scheduled_for), nao pelo horario
// exato do envio — assim "hoje" bate com o que o admin espera ver.
function periodFloor(period: SummaryPeriod): string | null {
  const today = todayInSaoPaulo();
  if (period === "today") return today;
  if (period === "7d") {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 6);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

export async function listOverview(period: SummaryPeriod = "today") {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: contacts, error: contactsError }, { data: dispatches, error: dispatchesError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabase.from("contacts").select("*").order("next_contact_date", { ascending: true }),
      supabase.from("reminder_dispatches").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("full_name", { ascending: true }),
    ]);

  if (contactsError) throw contactsError;
  if (dispatchesError) throw dispatchesError;
  if (profilesError) throw profilesError;

  const profileById = new Map(profiles.map((p) => [p.id, p]));

  // ultima linha de reminder_dispatches por contato (ja veio ordenado desc)
  const latestDispatchByContact = new Map<string, (typeof dispatches)[number]>();
  for (const dispatch of dispatches) {
    if (!latestDispatchByContact.has(dispatch.contact_id)) {
      latestDispatchByContact.set(dispatch.contact_id, dispatch);
    }
  }

  // quantos disparos "sent" seguidos sem virar "replied" pra cada contato.
  // Como o cron so reenvia enquanto contacts.status continua 'pending' (o
  // webhook marca 'done' assim que o funcionario responde), nunca existe um
  // "sent" depois de um "replied" pro mesmo contato — entao basta contar.
  const unansweredStreakByContact = new Map<string, number>();
  for (const dispatch of dispatches) {
    if (dispatch.status !== "sent") continue;
    unansweredStreakByContact.set(dispatch.contact_id, (unansweredStreakByContact.get(dispatch.contact_id) ?? 0) + 1);
  }

  const rows = contacts.map((contact) => ({
    contact,
    owner: profileById.get(contact.owner_id) ?? null,
    latestDispatch: latestDispatchByContact.get(contact.id) ?? null,
    unansweredStreak: unansweredStreakByContact.get(contact.id) ?? 0,
  }));

  // taxa de resposta por funcionario: quantos lembretes enviados de fato
  // chegaram vs quantos foram respondidos (webhook da Z-API marcou "replied").
  // Filtrado pelo periodo escolhido (hoje / 7 dias / total).
  const floor = periodFloor(period);
  const dispatchesInPeriod = floor ? dispatches.filter((d) => d.scheduled_for >= floor) : dispatches;

  const statsByEmployee = new Map<string, { sent: number; replied: number; failed: number }>();
  for (const dispatch of dispatchesInPeriod) {
    const stats = statsByEmployee.get(dispatch.employee_id) ?? { sent: 0, replied: 0, failed: 0 };
    if (dispatch.status === "failed") stats.failed += 1;
    else stats.sent += 1;
    if (dispatch.status === "replied") stats.replied += 1;
    statsByEmployee.set(dispatch.employee_id, stats);
  }

  const responseSummary = profiles
    .filter((p) => p.role === "employee")
    .map((employee) => {
      const stats = statsByEmployee.get(employee.id) ?? { sent: 0, replied: 0, failed: 0 };
      return {
        employee,
        sent: stats.sent,
        replied: stats.replied,
        pending: stats.sent - stats.replied,
        failed: stats.failed,
        responseRate: stats.sent > 0 ? stats.replied / stats.sent : null,
      };
    })
    .sort((a, b) => b.sent - a.sent);

  // "dinheiro na mesa": soma do valor de interesse dos leads ainda nao
  // convertidos, por funcionario — sinaliza quem esta convertendo pior.
  const moneyOnTableByEmployee = new Map<string, { total: number; count: number }>();
  for (const contact of contacts) {
    if (contact.contact_type !== "lead" || contact.converted) continue;
    const current = moneyOnTableByEmployee.get(contact.owner_id) ?? { total: 0, count: 0 };
    current.total += contact.lead_interest_value ?? DEFAULT_LEAD_INTEREST_VALUE;
    current.count += 1;
    moneyOnTableByEmployee.set(contact.owner_id, current);
  }

  const moneyOnTable = profiles
    .filter((p) => p.role === "employee")
    .map((employee) => {
      const stats = moneyOnTableByEmployee.get(employee.id) ?? { total: 0, count: 0 };
      return { employee, total: stats.total, count: stats.count };
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.total - a.total);

  return { rows, profiles, responseSummary, moneyOnTable, period };
}

export async function listEmployees() {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["employee", "manager", "financeiro"])
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });
  if (error) throw error;
  return data;
}

export const CreateEmployeeSchema = z.object({
  fullName: z.string().trim().min(2, "Informe o nome."),
  email: z.email("Email invalido."),
  whatsappNumber: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, "Use o formato internacional, ex: +5511999999999"),
  password: z.string().min(8, "A senha temporaria precisa ter ao menos 8 caracteres."),
  role: z.enum(["employee", "manager", "financeiro"]),
});

export async function createEmployee(input: z.infer<typeof CreateEmployeeSchema>) {
  const currentProfile = await requireAdmin();

  // so o CEO (admin de verdade) pode criar contas com papel elevado
  if (input.role !== "employee" && currentProfile.role !== "admin") {
    throw new Error("Somente o CEO pode criar contas de gerente ou financeiro.");
  }

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    throw createError ?? new Error("Falha ao criar usuario.");
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name: input.fullName,
    whatsapp_number: input.whatsappNumber,
    role: input.role,
  });

  if (profileError) {
    // evita usuario orfao no Auth sem profile correspondente
    await admin.auth.admin.deleteUser(created.user.id);
    throw profileError;
  }
}

export async function updateTemplate(stage: number, body: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("message_templates").update({ body }).eq("stage", stage);
  if (error) throw error;
}

export async function exportContactsForEmployee(employeeId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("name, instagram_handle, phone, last_purchase_value")
    .eq("owner_id", employeeId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data;
}
