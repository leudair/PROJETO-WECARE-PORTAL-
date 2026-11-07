export function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// week_end_date vem salvo no banco (periodo livre, nao so inicio + 5 dias).
export function formatWeekRange(weekStartIso: string, weekEndIso: string) {
  const start = new Date(`${weekStartIso}T00:00:00`);
  const end = new Date(`${weekEndIso}T00:00:00`);
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
