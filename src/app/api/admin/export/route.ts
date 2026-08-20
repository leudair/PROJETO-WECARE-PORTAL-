import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/data/auth";
import { exportContactsForEmployee } from "@/lib/data/admin";

function escapeCsvField(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  await requireAdmin(); // redireciona se nao for admin; DAL ja valida a sessao

  const employeeId = request.nextUrl.searchParams.get("employeeId");
  const format = request.nextUrl.searchParams.get("format") === "txt" ? "txt" : "csv";

  if (!employeeId) {
    return new Response("employeeId obrigatorio", { status: 400 });
  }

  const contacts = await exportContactsForEmployee(employeeId);

  if (format === "txt") {
    const lines = contacts.map(
      (c) => `${c.name}\t@${c.instagram_handle ?? ""}\t${c.phone}\t${c.last_purchase_value ?? ""}`
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
