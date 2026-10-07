"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { saveFinancialEntryAction } from "./actions";
import { EmployeeSelect } from "./employee-select";
import { formatCurrency } from "./format";

// evita digitar/escolher uma data que nao seja segunda-feira (foi o que
// gerou confusao antes: dava pra selecionar qualquer dia no calendario e o
// "periodo" calculado ficava errado). Em vez de um <input type="date">
// livre, o financeiro escolhe entre as ultimas semanas + a semana atual,
// ja com o intervalo completo (segunda a sabado) escrito no rotulo — o
// faturamento e' sempre lancado no sabado, entao a "semana atual" ja vem
// selecionada por padrao.
function toDateInputValue(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mondayOfCurrentWeek(): Date {
  const d = new Date();
  const day = d.getDay(); // 0=domingo
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

const WEEKS_BACK = 3;

function buildWeekOptions(): { value: string; label: string }[] {
  const currentMonday = mondayOfCurrentWeek();

  const options = [];
  for (let i = 0; i >= -WEEKS_BACK; i--) {
    const monday = new Date(currentMonday);
    monday.setDate(currentMonday.getDate() + i * 7);
    const saturday = new Date(monday);
    saturday.setDate(monday.getDate() + 5);
    const range = `${monday.toLocaleDateString("pt-BR")} a ${saturday.toLocaleDateString("pt-BR")}`;
    const tag = i === 0 ? " (semana atual)" : i === -1 ? " (semana passada)" : "";
    options.push({ value: toDateInputValue(monday), label: `${range}${tag}` });
  }
  return options;
}

const inputClass =
  "w-full rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary";

export function EntryForm({
  employees,
  rates,
  onSaved,
}: {
  employees: { id: string; full_name: string }[];
  rates: { tax: number; commission: number; variable: number };
  onSaved?: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveFinancialEntryAction, undefined);
  const weekOptions = useMemo(() => buildWeekOptions(), []);

  const [faturamento, setFaturamento] = useState(0);
  const [custoOperacional, setCustoOperacional] = useState(0);
  const [custoAnuncios, setCustoAnuncios] = useState(0);

  useEffect(() => {
    if (state?.success) onSaved?.();
  }, [state?.success, onSaved]);

  const preview = useMemo(() => {
    const imposto = faturamento * rates.tax;
    const comissao = faturamento * rates.commission;
    const variavel = faturamento * rates.variable;
    const lucroLiquido = faturamento - custoOperacional - custoAnuncios - imposto - comissao - variavel;
    return { imposto, comissao, variavel, lucroLiquido };
  }, [faturamento, custoOperacional, custoAnuncios, rates]);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Funcionário</label>
          <EmployeeSelect employees={employees} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Semana</label>
          <select name="weekStartDate" required defaultValue={weekOptions[0]?.value} className={inputClass}>
            {weekOptions.map((week) => (
              <option key={week.value} value={week.value}>
                {week.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Faturamento (R$)</label>
          <input
            type="number"
            name="faturamento"
            required
            min="0"
            step="0.01"
            className={inputClass}
            onChange={(e) => setFaturamento(Number(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Custo operacional/mercadoria (R$)</label>
          <input
            type="number"
            name="custoOperacional"
            required
            min="0"
            step="0.01"
            className={inputClass}
            onChange={(e) => setCustoOperacional(Number(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Custo de anúncios/tráfego (R$)</label>
          <input
            type="number"
            name="custoAnuncios"
            required
            min="0"
            step="0.01"
            className={inputClass}
            onChange={(e) => setCustoAnuncios(Number(e.target.value) || 0)}
          />
        </div>
      </div>

      {faturamento > 0 && (
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-background to-surface p-4 shadow-inner">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Resumo estimado</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted sm:grid-cols-4">
            <p>
              Imposto: <span className="text-foreground">{formatCurrency(preview.imposto)}</span>
            </p>
            <p>
              Comissão: <span className="text-foreground">{formatCurrency(preview.comissao)}</span>
            </p>
            <p>
              Variável: <span className="text-foreground">{formatCurrency(preview.variavel)}</span>
            </p>
            <p>
              Anúncios: <span className="text-foreground">{formatCurrency(custoAnuncios)}</span>
            </p>
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-sm font-semibold text-foreground">Lucro líquido estimado</span>
            <span className={`text-xl font-bold tabular-nums ${preview.lucroLiquido >= 0 ? "text-green-400" : "text-red-400"}`}>
              {formatCurrency(preview.lucroLiquido)}
            </span>
          </div>
        </div>
      )}

      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-400">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="btn-glossy w-full rounded-lg py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Salvar lançamento"}
      </button>
    </form>
  );
}
