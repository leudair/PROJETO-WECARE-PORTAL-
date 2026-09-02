import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Fica sob /api de proposito: o matcher do proxy.ts (src/proxy.ts) exclui
// tudo em /api, entao essa rota nunca sofre o redirecionamento de sessao do
// middleware antes de trocar o "code" por sessao.
//
// Fluxo OAuth do Google via Supabase: o browser chama signInWithOAuth(),
// o Google redireciona pro callback hospedado do proprio Supabase, que so
// entao redireciona pra cá com ?code=. Diferente do link de redefinicao de
// senha por email, aqui nao ha risco de scanner de spam pre-clicar o link —
// quem chega nesse GET ja passou pela tela de consentimento do Google.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/`);
    }
    // DEBUG TEMPORARIO: expoe a mensagem de erro real na URL pra diagnosticar
    // por que o login com Google esta falhando em producao. Remover depois.
    console.error("exchangeCodeForSession falhou:", error);
    return NextResponse.redirect(
      `${origin}/login?erro=google_invalido&debug=${encodeURIComponent(error.message)}`,
    );
  }

  console.error("Callback do Google sem 'code' na URL:", request.url);
  return NextResponse.redirect(`${origin}/login?erro=google_invalido&debug=no_code`);
}
