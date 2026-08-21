import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { SECONDS_PER_CONTACT_MIN } from "@/lib/data/reminders";

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

// Ex: "K7B2Q9" — ver CODE_ALPHABET em src/lib/data/reminders.ts (sem 0/O/1/I/L)
const CODE_PATTERN = /[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}/i;

interface IncomingMessage {
  senderPhone: string | null;
  text: string | null;
  referenceMessageId: string | null;
}

// A Z-API nao documenta um formato unico e estavel para o payload de
// "mensagem recebida" entre contas/versoes. Confirmado nos logs de producao
// em 2026-08-20: mensagens diretas trazem o telefone em `phone`, mensagens
// de grupo em `participantPhone` (que ignoramos — confirmacao so vale 1:1).
function parseIncoming(body: Record<string, unknown>): IncomingMessage | null {
  const type = (body.type as string | undefined) ?? (body.event as string | undefined);
  if (type && !/message|receivedcallback/i.test(type)) return null;
  if (body.fromMe === true) return null;
  if (body.isGroup === true) return null;

  const text =
    ((body.text as Record<string, unknown> | undefined)?.message as string | undefined) ?? null;

  const senderPhone = (body.phone as string | undefined) ?? null;

  const referenceMessageId =
    (body.referenceMessageId as string | undefined) ??
    ((body.contextInfo as Record<string, unknown> | undefined)?.stanzaId as string | undefined) ??
    null;

  return { senderPhone, text, referenceMessageId };
}

// Numeros de celular brasileiros ganharam um "9" extra apos o DDD ha alguns
// anos, mas o WhatsApp as vezes devolve o numero sem ele. Sem isso, um
// numero cadastrado com 9 nunca bateria com o que a Z-API manda no webhook.
function phoneVariants(phone: string): string[] {
  const digits = phone.replace(/\D/g, "");
  const variants = new Set([digits]);

  if (digits.startsWith("55") && digits.length >= 12) {
    const prefix = digits.slice(0, 4); // "55" + DDD
    const rest = digits.slice(4);
    if (rest.length === 9 && rest[0] === "9") {
      variants.add(prefix + rest.slice(1));
    } else if (rest.length === 8) {
      variants.add(prefix + "9" + rest);
    }
  }

  return [...variants].map((d) => `+${d}`);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return new NextResponse("Bad request", { status: 400 });
  }

  // Nunca logar o payload completo: `text.message` e' texto livre digitado
  // pelo funcionario e `phone` e' um dado pessoal — nao devem parar em log
  // de producao. So o necessario pra depurar problema de roteamento/match.
  console.log("Z-API webhook recebido:", {
    type: body.type ?? body.event ?? null,
    isGroup: body.isGroup === true,
    fromMe: body.fromMe === true,
    hasText: Boolean((body.text as Record<string, unknown> | undefined)?.message),
  });

  const incoming = parseIncoming(body);
  if (!incoming?.text) {
    return NextResponse.json({ ok: true, matched: false });
  }

  const admin = createAdminClient();
  const trimmedText = incoming.text.trim();

  if (trimmedText.toUpperCase() === "TUDO") {
    if (!incoming.senderPhone) {
      return NextResponse.json({ ok: true, matched: false });
    }

    const { data: employee, error: employeeError } = await admin
      .from("profiles")
      .select("id")
      .in("whatsapp_number", phoneVariants(incoming.senderPhone))
      .maybeSingle();

    if (employeeError) {
      console.error("Erro ao buscar funcionario pelo telefone:", employeeError);
      return new NextResponse("Internal error", { status: 500 });
    }
    if (!employee) {
      return NextResponse.json({ ok: true, matched: false });
    }

    const { data: pending, error: pendingError } = await admin
      .from("reminder_dispatches")
      .select("id, contact_id, sent_at")
      .eq("employee_id", employee.id)
      .eq("status", "sent");

    if (pendingError) {
      console.error("Erro ao buscar disparos pendentes:", pendingError);
      return new NextResponse("Internal error", { status: 500 });
    }
    if (!pending || pending.length === 0) {
      return NextResponse.json({ ok: true, matched: false });
    }

    const now = Date.now();
    const earliestSentAt = Math.min(...pending.map((d) => new Date(d.sent_at ?? now).getTime()));
    const elapsedSeconds = (now - earliestSentAt) / 1000;
    const expectedMinSeconds = pending.length * SECONDS_PER_CONTACT_MIN;
    const suspicious = elapsedSeconds < expectedMinSeconds;

    const dispatchIds = pending.map((d) => d.id);
    const contactIds = [...new Set(pending.map((d) => d.contact_id))];

    const { error: updateDispatchesError } = await admin
      .from("reminder_dispatches")
      .update({ status: "replied", replied_at: new Date().toISOString(), flagged_suspicious: suspicious })
      .in("id", dispatchIds);

    if (updateDispatchesError) {
      console.error("Erro ao confirmar disparos em lote:", updateDispatchesError);
      return new NextResponse("Internal error", { status: 500 });
    }

    const { error: updateContactsError } = await admin
      .from("contacts")
      .update({ status: "done" })
      .in("id", contactIds);

    if (updateContactsError) {
      console.error("Erro ao atualizar contatos em lote:", updateContactsError);
      return new NextResponse("Internal error", { status: 500 });
    }

    return NextResponse.json({ ok: true, matched: true, bulk: true, count: dispatchIds.length, suspicious });
  }

  // confirmacao individual por codigo
  const codeMatch = trimmedText.match(CODE_PATTERN);
  let dispatch: { id: string; contact_id: string; sent_at: string | null } | null = null;

  if (codeMatch) {
    const code = codeMatch[0].toUpperCase();
    const { data, error } = await admin
      .from("reminder_dispatches")
      .select("id, contact_id, sent_at")
      .eq("confirmation_code", code)
      .eq("status", "sent")
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar dispatch pelo codigo:", error);
      return new NextResponse("Internal error", { status: 500 });
    }
    dispatch = data;
  }

  // fallback: resposta citando a mensagem original (quando o cliente WhatsApp propaga isso corretamente)
  if (!dispatch && incoming.referenceMessageId) {
    const { data, error } = await admin
      .from("reminder_dispatches")
      .select("id, contact_id, sent_at")
      .eq("zapi_message_id", incoming.referenceMessageId)
      .eq("status", "sent")
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar dispatch pelo zapi_message_id:", error);
      return new NextResponse("Internal error", { status: 500 });
    }
    dispatch = data;
  }

  if (!dispatch) {
    // aceita o webhook (200) mas nao ha o que correlacionar — evita retries infinitos da Z-API
    return NextResponse.json({ ok: true, matched: false });
  }

  const elapsedSeconds = (Date.now() - new Date(dispatch.sent_at ?? Date.now()).getTime()) / 1000;
  const suspicious = elapsedSeconds < SECONDS_PER_CONTACT_MIN;

  const { error: updateDispatchError } = await admin
    .from("reminder_dispatches")
    .update({ status: "replied", replied_at: new Date().toISOString(), flagged_suspicious: suspicious })
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

  return NextResponse.json({ ok: true, matched: true, suspicious });
}
