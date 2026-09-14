import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { supabaseCookieOptions } from "@/lib/supabase/cookie-options";

const PUBLIC_PATHS = ["/login", "/esqueci-senha", "/confirmar-redefinicao", "/entrar-com-email", "/confirmar-entrada"];

// /redefinir-senha nao entra em PUBLIC_PATHS de proposito: ela so funciona
// com a sessao de recuperacao criada pelo clique em /confirmar-redefinicao
// (ver confirmar-redefinicao/actions.ts). Como PUBLIC_PATHS redireciona
// qualquer usuario JA autenticado (inclusive com sessao de recuperacao) para
// "/", colocar essa rota na lista faz o proprio clique de confirmacao cair
// direto na pagina principal em vez de abrir o formulario de nova senha.

// Checagem otimista de sessao (so le o cookie, sem consultar profiles/role
// no banco) e responsavel por renovar o token do Supabase a cada request.
// A checagem de PAPEL (employee vs admin) fica na Data Access Layer, perto
// dos dados — ver src/lib/data/auth.ts.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: supabaseCookieOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)"],
};
