// Compartilha o cookie de sessao com o subdominio radar.portalwecare.com.br,
// pra quem loga no Portal nao precisar logar de novo no Radar.
export const supabaseCookieOptions = {
  domain: process.env.NODE_ENV === "production" ? ".portalwecare.com.br" : undefined,
};
