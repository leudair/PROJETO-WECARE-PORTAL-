import type { NextConfig } from "next";

// CSP sem nonce (ver node_modules/next/dist/docs/.../content-security-policy.md):
// a abordagem com nonce exige renderizacao dinamica em TODAS as paginas
// (quebraria a pre-renderizacao estatica da /login) — 'unsafe-inline' em
// script-src/style-src e necessario porque o App Router injeta scripts
// inline de hidratacao (RSC payload) sem nonce nesse modo. Ainda assim a
// CSP bloqueia scripts/objetos de origens externas, restringe frames,
// form-action e base-uri, o que ja cobre a maior parte do risco real.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self';
  connect-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspHeader },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
];

// calculadora.html e aberta num iframe flutuante de dentro do proprio Portal
// (ver src/components/sidebar.tsx) — precisa permitir ser "framed" pela mesma
// origem. "frame-ancestors 'none'" / "X-Frame-Options: DENY" bloquearia isso
// mesmo vindo do nosso proprio dominio, entao essa pagina usa uma CSP a
// parte, so com "self" em vez de "none".
const framableCspHeader = cspHeader.replace("frame-ancestors 'none'", "frame-ancestors 'self'");
const framableSecurityHeaders = [
  { key: "Content-Security-Policy", value: framableCspHeader },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/calculadora\\.html",
        headers: framableSecurityHeaders,
      },
      {
        source: "/((?!calculadora\\.html$).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
