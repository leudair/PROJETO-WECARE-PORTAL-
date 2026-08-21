import { NextRequest } from "next/server";
import * as z from "zod";
import { requireAdmin } from "@/lib/data/auth";
import { exportContactsForEmployee } from "@/lib/data/admin";

// Neutraliza CSV/Formula Injection (CWE-1236): campos que comecam com
// = + - @ (ou tab/CR, que o Excel tambem trata como inicio de formula em
// alguns casos) sao interpretados como formula por Excel/Sheets ao abrir o
// arquivo exportado. name/instagram_handle vem de texto livre digitado pelo
// funcionario, entao precisam ser neutralizados antes de virar CSV.
function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function escapeCsvField(value: string) {
  const safe = neutralizeFormula(value);
  if (/[",\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

// TSV nao tem escaping de aspas, entao so remove os caracteres que
// quebrariam a estrutura de colunas/linhas (tab e quebra de linha), alem de
// neutralizar formula do mesmo jeito que no CSV.
function sanitizeTsvField(value: string): string {
  return neutralizeFormula(value).replace(/[\t\r\n]/g, " ");
}

const employeeIdSchema = z.uuid();

export async function GET(request: NextRequest) {
  await requireAdmin(); // redireciona se nao for admin; DAL ja valida a sessao

  const employeeIdParam = request.nextUrl.searchParams.get("employeeId");
  const format = request.nextUrl.searchParams.get("format") === "txt" ? "txt" : "csv";

  const parsedEmployeeId = employeeIdSchema.safeParse(employeeIdParam);
  if (!parsedEmployeeId.success) {
    return new Response("employeeId invalido", { status: 400 });
  }
  const employeeId = parsedEmployeeId.data;

  const contacts = await exportContactsForEmployee(employeeId);

  if (format === "txt") {
    const lines = contacts.map((c) =>
      [
        sanitizeTsvField(c.name),
        `@${sanitizeTsvField(c.instagram_handle ?? "")}`,
        sanitizeTsvField(c.phone),
        c.last_purchase_value ?? "",
      ].join("\t")
    );
    return new Response(lines.join("\n"), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="contatos-${employeeId}.txt"`,
      },
    });
  }

  const header = "nome,instagram,telefone,ultima_compra";
  const rows = contacts.map((c) =>
    [
      escapeCsvField(c.name),
      escapeCsvField(c.instagram_handle ?? ""),
      escapeCsvField(c.phone),
      c.last_purchase_value ?? "",
    ].join(",")
  );
  return new Response([header, ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contatos-${employeeId}.csv"`,
    },
  });
}
