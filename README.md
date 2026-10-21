# WeCare Portal

Sistema interno de lembrete de follow-up via WhatsApp. Um funcionário cadastra um cliente/lead com uma data de retorno; no dia marcado, o sistema manda um lembrete para o WhatsApp do PRÓPRIO funcionário (não do cliente) com uma sugestão de mensagem para copiar e colar. Se ele não confirmar (respondendo a mensagem), o lembrete repete no dia seguinte. O admin acompanha tudo em um painel central.

## Stack

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4 + Supabase (auth + Postgres com RLS) + Z-API (disparo de WhatsApp).

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencher com as credenciais abaixo
npm run dev
```

## 1. Criar o projeto Supabase

1. Acesse [supabase.com](https://supabase.com), crie um projeto **novo** (não reaproveitar o do WeCare Bio Boost — este app deve ficar isolado).
2. Em **Settings > API**, copie `Project URL` e a chave `anon public` para `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Copie também a chave `service_role` (fica em **Settings > API > Project API keys**) para `SUPABASE_SERVICE_ROLE_KEY` — **nunca** exponha essa chave no client, ela ignora toda a segurança (RLS).
4. Aplique a migração `supabase/migrations/0001_init.sql`: cole o conteúdo no **SQL Editor** do painel Supabase e rode. Isso cria as tabelas, os índices e as políticas de RLS (cada funcionário só vê o que cadastrou; admin vê tudo; o histórico de disparo/resposta é visível só para admin).
5. Crie a **primeira conta de admin** manualmente pelo SQL Editor, depois de criar o usuário em **Authentication > Users > Add user**:
   ```sql
   insert into public.profiles (id, full_name, whatsapp_number, role)
   values ('<uuid do usuário criado>', 'Seu nome', '+55...', 'admin');
   ```
   As contas de funcionário depois são criadas direto pelo painel admin (`/admin/employees`), sem precisar mexer no Supabase.

## 2. Criar a instância Z-API

1. Crie a conta em [z-api.io](https://z-api.io) e uma instância nova.
2. Conecte o **número de WhatsApp da empresa** escaneando o QR Code exibido no painel da instância (use o celular com esse número).
3. Na página da instância, copie **Instance ID** e **Token** para `ZAPI_INSTANCE_ID` / `ZAPI_TOKEN`.
4. Em **Segurança da conta** (nível de conta Z-API, não da instância), copie o **Client-Token** para `ZAPI_CLIENT_TOKEN`.
5. Configure o **webhook de mensagem recebida** da instância apontando para:
   `https://<seu-dominio>/api/webhooks/zapi?secret=<valor de ZAPI_WEBHOOK_SECRET>`
   (gere um valor aleatório para `ZAPI_WEBHOOK_SECRET`, ex: `openssl rand -hex 32`, e use o mesmo em `.env`/Vercel e na URL do webhook).

⚠️ O formato exato do payload de "mensagem recebida" pode variar entre contas/versões da Z-API. Depois de configurar o webhook, mande uma mensagem de teste respondendo (com reply/citação) a um lembrete e confira o payload nos logs da Vercel (`console.log` já deixado em `src/app/api/webhooks/zapi/route.ts`) — se o campo do ID da mensagem citada tiver outro nome, ajuste a função `parseReply` nesse arquivo.

## 3. Cron diário de disparo

- `CRON_SECRET`: gere outro valor aleatório (`openssl rand -hex 32`), diferente do `ZAPI_WEBHOOK_SECRET`.
- O `vercel.json` já agenda `/api/cron/dispatch-reminders` todo dia às 09:00 (horário de Brasília). A Vercel injeta automaticamente o header `Authorization: Bearer $CRON_SECRET` nesse tipo de rota — basta ter a env var `CRON_SECRET` configurada no projeto Vercel.

## 4. Recuperação de senha ("Esqueci minha senha")

1. Em **Authentication > URL Configuration**, confira se **Site URL** está com o domínio de produção (ex: `https://projeto-wecare-portal.vercel.app`), não `http://localhost:3000`.
2. Em **Authentication > Email Templates > Reset Password**, troque o link do template para usar `{{ .TokenHash }}` em vez de `{{ .ConfirmationURL }}` — isso faz o link ir direto para a página de confirmação da aplicação (`/confirmar-redefinicao`) em vez de passar pelo domínio do próprio Supabase, e funciona mesmo se o link for aberto num aparelho diferente do que pediu a redefinição. A página só troca o token pela sessão de recuperação quando a pessoa clica no botão — assim scanners de spam/antivírus que pré-clicam o link do email não gastam o token de uso único antes do clique real:
   ```html
   <a href="{{ .SiteURL }}/confirmar-redefinicao?token_hash={{ .TokenHash }}&type=recovery">Redefinir senha</a>
   ```

Sem esse ajuste no template, o Supabase continua usando o link padrão (`{{ .ConfirmationURL }}`), que pode falhar se o link for aberto num navegador/aparelho diferente de onde a redefinição foi pedida.

## 5. Login com Google

O botão "Continuar com Google" (`src/app/login/page.tsx`) usa `supabase.auth.signInWithOAuth()` e a rota `src/app/api/auth/callback/route.ts` pra trocar o código do Google pela sessão. Precisa de duas configurações manuais antes de funcionar:

1. **Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com)) → *APIs & Services > Credentials* → criar um **OAuth client ID** do tipo **Web application**.
   - Em **Authorized redirect URIs**, adicione a URL de callback que o Supabase mostra na tela do passo 2 (formato `https://<PROJECT_REF>.supabase.co/auth/v1/callback`).
   - Copie o **Client ID** e o **Client Secret** gerados.
2. Em **Authentication > Providers > Google** no painel do Supabase, ative o provider e cole o Client ID e Client Secret do passo 1.

Sem essa configuração, o clique no botão redireciona pro Google mas volta com erro (`?erro=google_invalido` na tela de login).

## Papéis e acesso

- **Funcionário** (`/dashboard`): cadastra e vê só os próprios clientes/leads, e consulta as mensagens-modelo do funil (somente leitura). Não vê se um lembrete foi respondido.
- **Admin** (`/admin`): vê todos os funcionários e seus contatos, status de disparo/resposta de cada lembrete, cria contas de funcionário, edita as mensagens-modelo (2ª a 6ª tentativa) e exporta a lista de clientes/leads de qualquer funcionário em CSV/TXT.

Controle de acesso é reforçado em duas camadas: Row Level Security no Postgres (o banco em si já bloqueia consultas fora do escopo do usuário) e checagem de papel na camada de dados da aplicação (`src/lib/data/auth.ts`).
