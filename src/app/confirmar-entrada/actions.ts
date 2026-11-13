"use server";

import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// So gasta o token de uso unico quando o usuario de fato clica no botao da
// pagina de confirmacao — nada aqui roda em resposta a uma GET (ver
// page.tsx), entao um scanner de spam/antivirus pre-clicando o link do
// email nao invalida o token antes do clique real.
export async function confirmMagicLink(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = formData.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      redirect("/");
    }
  }

  redirect("/confirmar-entrada?erro=link_invalido");
}
