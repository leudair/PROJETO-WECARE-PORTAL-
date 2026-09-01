function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Variavel de ambiente ausente: ${name}`);
  }
  return value;
}

// Prefixo NEXT_PUBLIC_ = seguro para o bundle do cliente (chave anon respeita RLS).
//
// process.env.NEXT_PUBLIC_* precisa aparecer aqui por extenso (acesso estatico)
// — o Next.js so consegue embutir essas variaveis no bundle do navegador quando
// encontra a expressao literal durante o build. Um acesso dinamico como
// process.env[nome] funciona no servidor (onde process.env e um objeto real em
// tempo de execucao) mas sempre fica undefined no navegador, mesmo com a
// variavel configurada certinho no Vercel.
export const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
export const supabaseAnonKey = requireEnv(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
