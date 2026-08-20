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
// Teto de execucao da Vercel pra essa rota. O loop abaixo para de processar
// novos envios perto desse limite e deixa o resto pra proxima invocacao do
// cron (que roda de poucos em poucos minutos — ver vercel.json), em vez de
// arriscar ser encerrado a forca no meio de um envio.
export const maxDuration = 60;
const FUNCTION_SAFETY_MARGIN_SECONDS = 10;

// So dispara entre esses horarios (horario de Brasilia) — antes que os
// funcionarios comecem o expediente (9h30), sem ser tao de madrugada que
// pareca atividade automatizada. Fora dessa janela, a rota nao faz nada,
// mesmo se o cron disparar (ver vercel.json cobre um pouco mais que a
// janela real de proposito, a checagem aqui e que garante a hora exata).
const WINDOW_START_SECONDS = 6 * 3600; // 06:00
const WINDOW_END_SECONDS = 11 * 3600; // 11:00

// Nunca espaca menos que isso, mesmo com volume alto — abaixo disso vira
// rajada de qualquer forma. O espacamento "ideal" real e calculado em tempo
// de execucao (tempo restante na janela ÷ contatos restantes), entao ele se
// ajusta sozinho conforme o volume diario mudar, sem precisar tocar aqui.
const MIN_GAP_SECONDS = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowInSaoPauloSeconds(): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 3600 + get("minute") * 60 + get("second");
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

  const force = request.nextUrl.searchParams.get("force") === "1";
  const nowSeconds = nowInSaoPauloSeconds();

  if (!force && (nowSeconds < WINDOW_START_SECONDS || nowSeconds >= WINDOW_END_SECONDS)) {
    return NextResponse.json({ skipped: "fora da janela de envio (06:00-11:00)", nowSeconds });
  }

  const today = todayInSaoPaulo();
  const dueContacts = await getDueContacts(today);

  const results: { contactId: string; status: "sent" | "failed" | "skipped" }[] = [];

  // separa quem ja foi disparado hoje (nao conta pro calculo de espacamento)
  const pending: typeof dueContacts = [];
  for (const contact of dueContacts) {
    if (await hasDispatchToday(contact.id, today)) {
      results.push({ contactId: contact.id, status: "skipped" });
    } else {
      pending.push(contact);
    }
  }

  if (pending.length === 0) {
    return NextResponse.json({ date: today, total: dueContacts.length, results });
  }

  const secondsRemainingInWindow = force
    ? pending.length * MIN_GAP_SECONDS
    : Math.max(1, WINDOW_END_SECONDS - nowSeconds);
  const idealGapSeconds = Math.max(MIN_GAP_SECONDS, secondsRemainingInWindow / pending.length);

  const functionStart = Date.now();
  const functionBudgetMs = (maxDuration - FUNCTION_SAFETY_MARGIN_SECONDS) * 1000;

  let dispatchCount = 0;

  for (const contact of pending) {
    if (Date.now() - functionStart > functionBudgetMs) {
      // sem tempo pra mais nesta execucao — o resto fica pra proxima rodada do cron
      break;
    }

    const owner = (contact as unknown as { profiles: { whatsapp_number: string } | null }).profiles;
    if (!owner?.whatsapp_number) {
      results.push({ contactId: contact.id, status: "failed" });
      continue;
    }

    if (dispatchCount > 0) {
      const jitter = 0.7 + Math.random() * 0.6; // 70%-130% do espacamento ideal
      await sleep(idealGapSeconds * 1000 * jitter);
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

  return NextResponse.json({
    date: today,
    total: dueContacts.length,
    pending: pending.length,
    idealGapSeconds: Math.round(idealGapSeconds),
    results,
  });
}
