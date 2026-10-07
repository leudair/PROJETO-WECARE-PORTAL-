export function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// entry.week_start_date e' sempre uma segunda-feira (ver lastMonday() no
// formulario) — a semana de trabalho vai de segunda a sabado, entao o fim
// e' sempre inicio + 5 dias.
export function formatWeekRange(weekStartIso: string) {
  const start = new Date(`${weekStartIso}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 5);
  return `${start.toLocaleDateString("pt-BR")} a ${end.toLocaleDateString("pt-BR")}`;
}

export const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
