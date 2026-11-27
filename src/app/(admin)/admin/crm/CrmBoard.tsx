"use client";

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import GlowCanvas from "./GlowCanvas";
import { sendCrmTelegramBlast } from "./actions";

type Card = {
  id: string;
  name: string;
  phone: string;
  ownerId: string;
  ownerName: string;
  value: number | null;
  referenceDate: string;
  tags: string[];
  pais: "brasil" | "fora";
  note: string | null;
};

type Column = {
  tag: string;
  key: string;
  label: string;
  color: string;
  cards: Card[];
};

type Stats = { clienteBrasil: number; clienteFora: number; leadBrasil: number; leadFora: number };

const DIAS_OPCOES = [5, 10, 15, 30] as const;

const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
const whatsapp = (tel: string) => `https://wa.me/${tel.replace(/\D/g, "")}`;

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  const nome = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

// quantos dias faz desde referenceDate ate hoje (so data, sem hora)
function diasAtras(iso: string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const d = new Date(`${iso}T00:00:00`);
  return Math.round((hoje.getTime() - d.getTime()) / 86400000);
}

function CardTile({ card, color }: { card: Card; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = ref.current;
    if (!r) return;
    const b = r.getBoundingClientRect();
    r.style.setProperty("--mx", `${e.clientX - b.left}px`);
    r.style.setProperty("--my", `${e.clientY - b.top}px`);
  };
  const extraTags = card.tags.filter((t) => !/^cliente (até|acima de) R\$|^cliente (frequente|recente)|^lead (engajado|não engajado)/i.test(t));
  return (
    <div className="crm-card" ref={ref} onPointerMove={onMove} style={{ "--k": color } as React.CSSProperties}>
      <div className="crm-card-top">
        <b>{card.name || card.phone}</b>
        <span className="crm-flag">{card.pais === "brasil" ? "🇧🇷" : "🌍"}</span>
      </div>
      <div className="crm-card-row">
        <a href={whatsapp(card.phone)} target="_blank" rel="noreferrer">{card.phone}</a>
        <span className="crm-owner">{card.ownerName}</span>
      </div>
      <div className="crm-card-row">
        {card.value != null ? <span className="crm-value">{formatCurrency(card.value)}</span> : <span className="crm-dim">—</span>}
        <span className="crm-dim">{formatDate(card.referenceDate)}</span>
      </div>
      {extraTags.length > 0 && (
        <div className="crm-chips">
          {extraTags.map((t) => <span key={t} className="crm-chip">{t}</span>)}
        </div>
      )}
      {card.note && <p className="crm-note">{card.note}</p>}
    </div>
  );
}

function ColumnBlock({
  col,
  owner,
}: {
  col: Column;
  owner: string;
}) {
  const [dias, setDias] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const cards = dias == null ? col.cards : col.cards.filter((c) => diasAtras(c.referenceDate) <= dias);
  const total = cards.reduce((n, c) => n + (c.value ?? 0), 0);
  // o botao do Telegram so faz sentido com UMA vendedora selecionada (senao nao da pra saber pra qual bot mandar)
  const podeEnviar = owner !== "todas" && dias != null && cards.length > 0;

  async function enviarTelegram() {
    if (!podeEnviar) return;
    setEnviando(true);
    setMsg(null);
    try {
      const r = await sendCrmTelegramBlast(
        cards[0].ownerId,
        `${col.label} — últimos ${dias} dias`,
        cards.map((c) => ({ name: c.name, phone: c.phone, value: c.value }))
      );
      setMsg(`Enviado pro Telegram da ${r.vendedora} (${r.enviados}).`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro ao enviar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="crm-col" style={{ "--k": col.color } as React.CSSProperties}>
      <div className="crm-col-glow" />
      <header className="crm-col-head">
        <i />
        <span>{col.label}</span>
        <b>{cards.length}</b>
      </header>
      {total > 0 && <p className="crm-col-total">{formatCurrency(total)}</p>}

      <div className="crm-col-tools">
        <div className="crm-col-days">
          <button type="button" className={dias == null ? "on" : ""} onClick={() => setDias(null)}>
            Tudo
          </button>
          {DIAS_OPCOES.map((d) => (
            <button key={d} type="button" className={dias === d ? "on" : ""} onClick={() => setDias(d)}>
              {d}d
            </button>
          ))}
        </div>
        <button type="button" className="crm-telegram-btn" disabled={!podeEnviar || enviando} onClick={enviarTelegram} title={owner === "todas" ? "Selecione uma vendedora primeiro" : undefined}>
          {enviando ? "Enviando…" : "📨 Telegram"}
        </button>
      </div>
      {msg && <p className="crm-telegram-msg">{msg}</p>}

      <div className="crm-col-list">
        {cards.length === 0 ? (
          <p className="crm-empty">Nenhum contato aqui com esse filtro.</p>
        ) : (
          cards.map((card) => <CardTile key={card.id} card={card} color={col.color} />)
        )}
      </div>
    </div>
  );
}

export default function CrmBoard({ columns, stats }: { columns: Column[]; stats: Stats }) {
  const [owner, setOwner] = useState("todas");
  const [pais, setPais] = useState("todos");
  const [month, setMonth] = useState("todos");
  const tiltRef = useRef<HTMLDivElement>(null);

  const owners = useMemo(() => {
    const map = new Map<string, string>();
    columns.forEach((c) => c.cards.forEach((card) => map.set(card.ownerId, card.ownerName)));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [columns]);

  const months = useMemo(() => {
    const set = new Set<string>();
    columns.forEach((c) => c.cards.forEach((card) => set.add(card.referenceDate.slice(0, 7))));
    return Array.from(set).sort().reverse();
  }, [columns]);

  const filtered = useMemo(
    () =>
      columns.map((col) => ({
        ...col,
        cards: col.cards.filter(
          (c) =>
            (owner === "todas" || c.ownerId === owner) &&
            (pais === "todos" || c.pais === pais) &&
            (month === "todos" || c.referenceDate.startsWith(month))
        ),
      })),
    [columns, owner, pais, month]
  );

  const onBoardMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    if (!el || !matchMedia("(hover:hover)").matches) return;
    const r = el.getBoundingClientRect();
    const rx = -((e.clientY - r.top) / r.height - 0.5) * 1.4;
    const ry = ((e.clientX - r.left) / r.width - 0.5) * 1.8;
    el.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
  };
  const onBoardLeave = () => {
    if (tiltRef.current) tiltRef.current.style.transform = "rotateX(0) rotateY(0)";
  };

  const totalCards = filtered.reduce((n, c) => n + c.cards.length, 0);

  return (
    <div className="crm-board">
      <GlowCanvas />
      <div className="crm-board-in">
        <header className="crm-head">
          <div>
            <h1>CRM da equipe</h1>
            <p>De W1 ao último W cadastrado — {totalCards} contato{totalCards === 1 ? "" : "s"} no board agora.</p>
          </div>
        </header>

        <div className="crm-stats">
          <div className="crm-stat"><b>{stats.clienteBrasil}</b><span>Clientes Brasil</span></div>
          <div className="crm-stat"><b>{stats.clienteFora}</b><span>Clientes fora do país</span></div>
          <div className="crm-stat"><b>{stats.leadBrasil}</b><span>Leads Brasil</span></div>
          <div className="crm-stat"><b>{stats.leadFora}</b><span>Leads fora do país</span></div>
        </div>

        <div className="crm-filters">
          <div className="crm-pills">
            <button type="button" className={owner === "todas" ? "on" : ""} onClick={() => setOwner("todas")}>Todas</button>
            {owners.map(([id, name]) => (
              <button key={id} type="button" className={owner === id ? "on" : ""} onClick={() => setOwner(id)}>{name}</button>
            ))}
          </div>
          <div className="crm-pills">
            <button type="button" className={pais === "todos" ? "on" : ""} onClick={() => setPais("todos")}>Todos os países</button>
            <button type="button" className={pais === "brasil" ? "on" : ""} onClick={() => setPais("brasil")}>🇧🇷 Brasil</button>
            <button type="button" className={pais === "fora" ? "on" : ""} onClick={() => setPais("fora")}>🌍 Fora do país</button>
          </div>
          {months.length > 0 && (
            <select className="crm-select" value={month} onChange={(e) => setMonth(e.target.value)}>
              <option value="todos">Todos os meses</option>
              {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          )}
        </div>

        <div className="crm-tilt" onPointerMove={onBoardMove} onPointerLeave={onBoardLeave}>
          <div className="crm-kanban" ref={tiltRef}>
            {filtered.map((col) => (
              <ColumnBlock key={col.key} col={col} owner={owner} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
