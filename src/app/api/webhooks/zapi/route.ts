import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.ZAPI_WEBHOOK_SECRET;
  if (!expected) return false;

  const provided = request.nextUrl.searchParams.get("secret") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// A Z-API nao documenta um formato unico e estavel para o payload de
// "mensagem recebida" entre contas/versoes. Isto tenta cobrir os formatos
// mais comuns, mas o payload REAL deve ser conferido nos logs (Vercel)
// na primeira mensagem de teste e este parser ajustado se necessario.
function parseReply(body: Record<string, unknown>): { quotedMessageId: string | null } | null {
  // eventos que nao sao "mensagem recebida" (ex: status de entrega) sao ignorados
  const type = (body.type as string | undefined) ?? (body.event as string | undefined);
  if (type && !/message|receivedcallback/i.test(type)) return null;

  const message = (body.message as Record<string, unknown> | undefined) ?? body;

  const quotedMessageId =
    (message?.referenceMessageId as string | undefined) ??
    ((message?.contextInfo as Record<string, unknown> | undefined)?.stanzaId as string | undefined) ??
    ((body?.contextInfo as Record<string, unknown> | undefined)?.stanzaId as string | undefined) ??
    null;

  return { quotedMessageId };
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return new NextResponse("Bad request", { status: 400 });
  }

  console.log("Z-API webhook payload:", JSON.stringify(body));

  const parsed = parseReply(body);
  if (!parsed?.quotedMessageId) {
    // aceita o webhook (200) mas nao ha o que correlacionar — evita retries infinitos da Z-API
    return NextResponse.json({ ok: true, matched: false });
  }

  const admin = createAdminClient();

  const { data: dispatch, error: findError } = await admin
    .from("reminder_dispatches")
    .select("id, contact_id")
    .eq("zapi_message_id", parsed.quotedMessageId)
    .maybeSingle();

  if (findError) {
    console.error("Erro ao buscar dispatch pelo zapi_message_id:", findError);
    return new NextResponse("Internal error", { status: 500 });
  }

  if (!dispatch) {
    return NextResponse.json({ ok: true, matched: false });
  }

  const { error: updateDispatchError } = await admin
    .from("reminder_dispatches")
    .update({ status: "replied", replied_at: new Date().toISOString() })
    .eq("id", dispatch.id);

  if (updateDispatchError) {
    console.error("Erro ao atualizar dispatch:", updateDispatchError);
    return new NextResponse("Internal error", { status: 500 });
  }

  const { error: updateContactError } = await admin
    .from("contacts")
    .update({ status: "done" })
    .eq("id", dispatch.contact_id);

  if (updateContactError) {
    console.error("Erro ao atualizar contato:", updateContactError);
    return new NextResponse("Internal error", { status: 500 });
  }

  return NextResponse.json({ ok: true, matched: true });
}
