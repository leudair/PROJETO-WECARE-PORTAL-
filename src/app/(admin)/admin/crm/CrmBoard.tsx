"use client";

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import GlowCanvas from "./GlowCanvas";

type Card = {
  id: string;
  name: string;
  phone: string;
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

const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
const whatsapp = (tel: string) => `https://wa.me/${tel.replace(/\D/g, "")}`;

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  const nome = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
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

export default function CrmBoard({ columns }: { columns: Column[] }) {
  const [owner, setOwner] = useState("todas");
  const [pais, setPais] = useState("todos");
  const [month, setMonth] = useState("todos");
  const tiltRef = useRef<HTMLDivElement>(null);

  const owners = useMemo(() => {
    const set = new Set<string>();
    columns.forEach((c) => c.cards.forEach((card) => set.add(card.ownerName)));
    return Array.from(set).sort();
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
            (owner === "todas" || c.ownerName === owner) &&
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
          <h1>CRM da equipe</h1>
          <p>De W1 ao último W cadastrado — {totalCards} contato{totalCards === 1 ? "" : "s"} no board agora.</p>
        </header>

        <div className="crm-filters">
          <div className="crm-pills">
            <button type="button" className={owner === "todas" ? "on" : ""} onClick={() => setOwner("todas")}>Todas</button>
            {owners.map((o) => (
              <button key={o} type="button" className={owner === o ? "on" : ""} onClick={() => setOwner(o)}>{o}</button>
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
            {filtered.map((col) => {
              const total = col.cards.reduce((n, c) => n + (c.value ?? 0), 0);
              return (
                <div key={col.key} className="crm-col" style={{ "--k": col.color } as React.CSSProperties}>
                  <div className="crm-col-glow" />
                  <header className="crm-col-head">
                    <i />
                    <span>{col.label}</span>
                    <b>{col.cards.length}</b>
                  </header>
                  {total > 0 && <p className="crm-col-total">{formatCurrency(total)}</p>}
                  <div className="crm-col-list">
                    {col.cards.length === 0 ? (
                      <p className="crm-empty">Nenhum contato aqui com esse filtro.</p>
                    ) : (
                      col.cards.map((card) => <CardTile key={card.id} card={card} color={col.color} />)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
