import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sendWhatsAppText } from "@/lib/zapi/client";
import {
  buildReminderText,
  generateConfirmationCode,
  getDueContacts,
  getTemplateBody,
  hasDispatchToday,
  recordDispatch,
  todayInSaoPaulo,
} from "@/lib/data/reminders";

export const dynamic = "force-dynamic";
// Teto de execucao da Vercel para essa rota — o espacamento entre envios
// (ver DELAY_*) precisa caber dentro desse tempo. Se o volume diario crescer
// a ponto de estourar esse limite, a solucao e rodar o cron com mais
// frequencia (lotes menores) em vez de aumentar isso indefinidamente.
export const maxDuration = 60;

// Espera um intervalo aleatorio entre cada disparo pra nao parecer atividade
// de robo pro WhatsApp e nao estourar limite de taxa da Z-API.
const DELAY_MIN_MS = 2000;
const DELAY_MAX_MS = 4000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay() {
  return DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS);
}

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const header = request.headers.get("authorization") ?? "";
  const provided = header.replace(/^Bearer\s+/i, "");

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const today = todayInSaoPaulo();
  const dueContacts = await getDueContacts(today);

  const results: { contactId: string; status: "sent" | "failed" | "skipped" }[] = [];
  let dispatchCount = 0;

  for (const contact of dueContacts) {
    const alreadySent = await hasDispatchToday(contact.id, today);
    if (alreadySent) {
      results.push({ contactId: contact.id, status: "skipped" });
      continue;
    }

    const owner = (contact as unknown as { profiles: { whatsapp_number: string } | null }).profiles;
    if (!owner?.whatsapp_number) {
      results.push({ contactId: contact.id, status: "failed" });
      continue;
    }

    // espaca os envios reais (nao os pulados) pra nao disparar tudo em rajada
    if (dispatchCount > 0) {
      await sleep(randomDelay());
    }
    dispatchCount += 1;

    const templateBody =
      contact.contact_type === "lead" && contact.attempt_stage
        ? await getTemplateBody(contact.attempt_stage)
        : null;

    const confirmationCode = generateConfirmationCode();
    const text = buildReminderText(contact, templateBody, confirmationCode);

    try {
      const { zapiMessageId } = await sendWhatsAppText(owner.whatsapp_number, text);
      await recordDispatch({
        contactId: contact.id,
        employeeId: contact.owner_id,
        scheduledFor: today,
        zapiMessageId,
        status: "sent",
        confirmationCode,
      });
      results.push({ contactId: contact.id, status: "sent" });
    } catch (err) {
      await recordDispatch({
        contactId: contact.id,
        employeeId: contact.owner_id,
        scheduledFor: today,
        zapiMessageId: null,
        status: "failed",
        confirmationCode: null,
      });
      results.push({ contactId: contact.id, status: "failed" });
      console.error(`Falha ao disparar lembrete ${contact.id}:`, err);
    }
  }

  return NextResponse.json({ date: today, total: dueContacts.length, results });
}
