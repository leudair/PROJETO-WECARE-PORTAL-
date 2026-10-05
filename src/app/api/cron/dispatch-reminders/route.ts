import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sendWhatsAppText } from "@/lib/zapi/client";
import {
  buildReminderText,
  claimDispatch,
  deferContactToNextDay,
  getTodayDispatchState,
  getDueContacts,
  getTemplateBody,
  markDispatchFailed,
  markDispatchSent,
  todayInSaoPaulo,
} from "@/lib/data/reminders";

export const dynamic = "force-dynamic";

// Teto de execucao da Vercel pra essa rota. O lote de cada invocacao e'
// dimensionado pra caber folgado aqui dentro — nenhuma espera longa acontece
// dentro da funcao (ver NOTA SOBRE ESPACAMENTO abaixo).
export const maxDuration = 60;
const FUNCTION_SAFETY_MARGIN_SECONDS = 10;

// So dispara entre esses horarios (horario de Brasilia) — antes que os
// funcionarios comecem o expediente (9h30), sem ser tao de madrugada que
// pareca atividade automatizada.
//
// Quem chama essa rota de 5 em 5 min e' o pg_cron do Supabase
// (supabase/migrations/0010_cron_dispatch_reminders.sql), com "*/5 9-13 * * *"
// em UTC = 06:00-10:55 de Brasilia, inteiramente dentro desta janela. O cron
// da Vercel nao serve: a conta e' Hobby, que so permite um disparo por dia.
// O Brasil nao tem mais horario de verao desde 2019, entao UTC-3 vale o ano
// todo e os dois nao se descolam.
const WINDOW_START_SECONDS = 6 * 3600; // 06:00
const WINDOW_END_SECONDS = 11 * 3600; // 11:00

// NOTA SOBRE ESPACAMENTO
// O espacamento ao longo da manha vem da FREQUENCIA DO AGENDADOR, nao de
// dormir dentro da funcao. A versao anterior calculava "janela restante ÷
// pendentes" e dormia esse tanto (podia dar 30 min) — a Vercel matava a
// funcao no meio do sleep e so 1 mensagem saia por invocacao.
//
// Agora cada invocacao manda um lote pequeno, e o tamanho do lote se ajusta
// sozinho ao volume: pendentes ÷ ticks que ainda cabem na janela. Com pouca
// gente vira 1 por tick (bem espacado); com muita gente sobe ate
// MAX_DISPATCHES_PER_RUN. Se um tick for perdido, o seguinte ve menos ticks
// restantes e manda um lote maior pra compensar.
const SCHEDULER_TICK_SECONDS = 5 * 60; // tem que casar com o cron em 0010_cron_dispatch_reminders.sql
const MAX_DISPATCHES_PER_RUN = 8;
const GAP_SECONDS = 4; // dentro do lote, so pra nao virar rajada

// TETO POR FUNCIONARIO, POR DIA
// Cada lembrete e' uma mensagem de WhatsApp separada na mao do funcionario.
// Sem teto, um acumulo de pendencia viraria dezenas de mensagens na mesma
// manha pra mesma pessoa — inutil pra quem recebe e um bom jeito de ter a
// instancia da Z-API bloqueada por comportamento de spam. O que passar do
// teto fica pendente e entra nos dias seguintes (o mais atrasado primeiro,
// ver a ordenacao em getDueContacts).
const MAX_DISPATCHES_PER_EMPLOYEE_PER_DAY = 20;

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

type DispatchStatus = "sent" | "failed" | "claimed-by-other";

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

  // Uma query so pra todo o lote, em vez de uma por contato.
  const { contactIds: alreadyDispatched, countByEmployee } = await getTodayDispatchState(today);
  const pending = dueContacts.filter((contact) => !alreadyDispatched.has(contact.id));

  // Aplica o teto por funcionario percorrendo na ordem definida por
  // getDueContacts (mais atrasado primeiro), pra que quem ficar de fora seja
  // sempre o mais recente — e nao um contato qualquer.
  const eligible: typeof pending = [];
  const projectedByEmployee = new Map(countByEmployee);
  for (const contact of pending) {
    const used = projectedByEmployee.get(contact.owner_id) ?? 0;
    if (used >= MAX_DISPATCHES_PER_EMPLOYEE_PER_DAY) continue;
    projectedByEmployee.set(contact.owner_id, used + 1);
    eligible.push(contact);
  }

  const summary = {
    date: today,
    due: dueContacts.length,
    alreadyDispatchedToday: dueContacts.length - pending.length,
    pending: pending.length,
    heldByEmployeeCap: pending.length - eligible.length,
  };

  if (eligible.length === 0) {
    return NextResponse.json({ ...summary, targetThisRun: 0, dispatched: 0, results: [] });
  }

  // Quantos mandar nesta invocacao (ver NOTA SOBRE ESPACAMENTO).
  const ticksRemaining = force
    ? 1
    : Math.max(1, Math.floor((WINDOW_END_SECONDS - nowSeconds) / SCHEDULER_TICK_SECONDS));
  const targetThisRun = Math.min(
    MAX_DISPATCHES_PER_RUN,
    Math.max(1, Math.ceil(eligible.length / ticksRemaining))
  );

  const functionStart = Date.now();
  const functionBudgetMs = (maxDuration - FUNCTION_SAFETY_MARGIN_SECONDS) * 1000;

  const results: { contactId: string; status: DispatchStatus }[] = [];
  let dispatchCount = 0;

  for (const contact of eligible) {
    if (dispatchCount >= targetThisRun) break;

    const elapsedMs = Date.now() - functionStart;
    const gapMs = dispatchCount > 0 ? GAP_SECONDS * 1000 : 0;
    // Sem tempo pra mais um envio COM a espera que vem antes dele: para aqui e
    // deixa o resto pro proximo tick, em vez de ser morto no meio do caminho.
    if (elapsedMs + gapMs > functionBudgetMs) break;

    if (gapMs > 0) {
      const jitter = 0.7 + Math.random() * 0.6; // 70%-130%, pra nao sair num ritmo robotico
      await sleep(gapMs * jitter);
    }

    // Tudo daqui pra baixo e' por contato e nunca pode derrubar a rodada
    // inteira — um contato com problema nao deve impedir os outros de sair.
    try {
      const owner = (contact as unknown as { profiles: { whatsapp_number: string } | null })
        .profiles;

      // Reserva ANTES de enviar: e' isso que impede duas execucoes
      // simultaneas de mandarem o mesmo lembrete duas vezes.
      const claim = await claimDispatch({
        contactId: contact.id,
        employeeId: contact.owner_id,
        scheduledFor: today,
      });

      if (!claim) {
        results.push({ contactId: contact.id, status: "claimed-by-other" });
        continue;
      }

      if (!owner?.whatsapp_number) {
        await markDispatchFailed(claim.dispatchId);
        results.push({ contactId: contact.id, status: "failed" });
        console.error(`Contato ${contact.id}: funcionario sem whatsapp_number cadastrado.`);
        continue;
      }

      dispatchCount += 1;

      const templateBody =
        contact.contact_type === "lead" && contact.attempt_stage
          ? await getTemplateBody(contact.attempt_stage)
          : null;

      const text = buildReminderText(contact, templateBody, claim.confirmationCode);

      try {
        const { zapiMessageId } = await sendWhatsAppText(owner.whatsapp_number, text);
        await markDispatchSent(claim.dispatchId, zapiMessageId);
        // Sai da frente da fila: volta amanha, atras de quem esta mais
        // atrasado. Sem isso a fila trava nos mesmos contatos (ver
        // deferContactToNextDay).
        await deferContactToNextDay(contact.id, today);
        results.push({ contactId: contact.id, status: "sent" });
      } catch (err) {
        // A reserva ja existe, entao aqui e' update — nao tem como colidir com
        // o unique index (era esse o bug: o catch antigo tentava inserir de
        // novo, violava o indice e derrubava o resto da fila).
        await markDispatchFailed(claim.dispatchId);
        results.push({ contactId: contact.id, status: "failed" });
        console.error(`Falha ao disparar lembrete ${contact.id}:`, err);
      }
    } catch (err) {
      results.push({ contactId: contact.id, status: "failed" });
      console.error(`Erro inesperado no contato ${contact.id}:`, err);
    }
  }

  return NextResponse.json({
    ...summary,
    ticksRemaining,
    targetThisRun,
    dispatched: dispatchCount,
    // So os contatos de fato processados nesta invocacao. O que sobrou nao
    // vira entrada aqui: com algumas centenas de pendentes a resposta ficava
    // ilegivel, e e' por ela que se acompanha o robo (os counts acima dizem
    // quanto ficou pra tras e por que).
    results,
  });
}
