import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { SECONDS_PER_CONTACT_MIN } from "@/lib/data/reminders";
import { todayInSaoPaulo } from "@/lib/date";

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

// Ex: "K7B2Q9" — ver CODE_ALPHABET em src/lib/data/reminders.ts (sem 0/O/1/I/L).
// O  nas pontas e' necessario: sem ele, qualquer sequencia de 6 caracteres
// do alfabeto DENTRO de uma palavra casava ("FECHADO" -> "FECHAD"), e um
// funcionario respondendo em texto livre podia confirmar um disparo a esmo.
const CODE_PATTERN = /[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}/i;

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

type Admin = ReturnType<typeof createAdminClient>;

// maybeSingle() aqui virava erro 500 quando duas variantes do mesmo numero
// casavam dois perfis distintos. Com limit(1) o webhook segue funcionando —
// cadastro duplicado e' problema de dado, nao motivo pra derrubar a rota.
async function findEmployeeIdByPhone(admin: Admin, phone: string): Promise<string | null> {
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .in("whatsapp_number", phoneVariants(phone))
    .limit(1);

  if (error) {
    console.error("Erro ao buscar funcionario pelo telefone:", error);
    throw error;
  }
  return data?.[0]?.id ?? null;
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

    let employeeId: string | null;
    try {
      employeeId = await findEmployeeIdByPhone(admin, incoming.senderPhone);
    } catch {
      return new NextResponse("Internal error", { status: 500 });
    }
    if (!employeeId) {
      return NextResponse.json({ ok: true, matched: false });
    }

    // scheduled_for = hoje e' essencial. Sem esse filtro, o "TUDO" confirmava
    // TODOS os disparos 'sent' do funcionario desde sempre e marcava os
    // contatos como done — pendencia de dias anteriores que nunca foi
    // realmente trabalhada era apagada silenciosamente.
    const { data: pending, error: pendingError } = await admin
      .from("reminder_dispatches")
      .select("id, contact_id, sent_at")
      .eq("employee_id", employeeId)
      .eq("status", "sent")
      .eq("scheduled_for", todayInSaoPaulo());

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
  let dispatch: {
    id: string;
    contact_id: string;
    sent_at: string | null;
    employee_id: string;
  } | null = null;

  if (codeMatch) {
    const code = codeMatch[0].toUpperCase();
    const { data, error } = await admin
      .from("reminder_dispatches")
      .select("id, contact_id, sent_at, employee_id")
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
      .select("id, contact_id, sent_at, employee_id")
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

  // O codigo chegou pelo WhatsApp de quem recebeu o lembrete? Se o remetente
  // resolve pra um funcionario DIFERENTE do dono do disparo, recusa — um
  // codigo repassado nao deve confirmar o contato de outra pessoa. Quando o
  // remetente nao resolve pra nenhum perfil, segue em frente (o numero pode
  // estar cadastrado num formato que phoneVariants nao cobre, e barrar aqui
  // quebraria a confirmacao de todo mundo nesse caso).
  if (incoming.senderPhone) {
    let senderEmployeeId: string | null;
    try {
      senderEmployeeId = await findEmployeeIdByPhone(admin, incoming.senderPhone);
    } catch {
      return new NextResponse("Internal error", { status: 500 });
    }

    if (senderEmployeeId && senderEmployeeId !== dispatch.employee_id) {
      console.warn("Codigo de confirmacao enviado por funcionario que nao e' o dono do disparo.");
      return NextResponse.json({ ok: true, matched: false });
    }
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
