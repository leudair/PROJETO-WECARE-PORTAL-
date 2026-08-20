import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sendWhatsAppText } from "@/lib/zapi/client";
import {
  buildReminderText,
  getDueContacts,
  getTemplateBody,
  hasDispatchToday,
  recordDispatch,
  todayInSaoPaulo,
} from "@/lib/data/reminders";

export const dynamic = "force-dynamic";

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

    const templateBody =
      contact.contact_type === "lead" && contact.attempt_stage
        ? await getTemplateBody(contact.attempt_stage)
        : null;

    const text = buildReminderText(contact, templateBody);

    try {
      const { zapiMessageId } = await sendWhatsAppText(owner.whatsapp_number, text);
      await recordDispatch({
        contactId: contact.id,
        employeeId: contact.owner_id,
        scheduledFor: today,
        zapiMessageId,
        status: "sent",
      });
      results.push({ contactId: contact.id, status: "sent" });
    } catch (err) {
      await recordDispatch({
        contactId: contact.id,
        employeeId: contact.owner_id,
        scheduledFor: today,
        zapiMessageId: null,
        status: "failed",
      });
      results.push({ contactId: contact.id, status: "failed" });
      console.error(`Falha ao disparar lembrete ${contact.id}:`, err);
    }
  }

  return NextResponse.json({ date: today, total: dueContacts.length, results });
}
