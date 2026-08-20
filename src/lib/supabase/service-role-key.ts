import "server-only";

// Chave service_role ignora RLS por completo. Nunca importar este modulo
// fora de rotas de servidor (cron / webhook) que precisam agir por trás
// de qualquer usuario autenticado.
export function supabaseServiceRoleKey(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) {
    throw new Error("Variavel de ambiente ausente: SUPABASE_SERVICE_ROLE_KEY");
  }
  return value;
}
