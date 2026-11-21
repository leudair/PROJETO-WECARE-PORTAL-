import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayInSaoPaulo } from "@/lib/date";
import { expedienteDeHoje, formatarHora, relatorioDeHoje, resumoVendedora } from "@/lib/data/portal";
import { ResumoCards } from "@/components/resumo-cards";

// "Ver como": mostra o painel do dia da vendedora como ela ve, so leitura.
// Cada entrada fica registrada em portal_acessos_admin.
export default async function VerComoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!profile) notFound();

  await supabase.rpc("portal_registrar_ver_como", { p_alvo: id });

  const hoje = todayInSaoPaulo();
  const [expediente, relatorio, resumo] = await Promise.all([
    expedienteDeHoje(id),
    relatorioDeHoje(id),
    resumoVendedora(id, hoje, hoje),
  ]);

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/40 bg-primary/15 px-4 py-3 backdrop-blur">
        <p className="text-sm font-semibold text-foreground">
          Você está vendo como {profile.full_name} · só leitura
        </p>
        <Link href={`/admin/equipe/${id}`} className="btn-vidro">
          Sair do modo Ver como
        </Link>
      </div>

      <div className="card-glass p-5">
        <p className="text-sm text-muted">
          {expediente
            ? `Dia aberto às ${formatarHora(expediente.aberto_em)}.`
            : "Ela ainda não abriu o dia: o painel dela está travado na tela de assinatura."}{" "}
          {relatorio && `Dia fechado e assinado às ${formatarHora(relatorio.assinado_em)}.`}
        </p>
      </div>

      {resumo && <ResumoCards resumo={resumo} />}

      <div className="card-glass p-5 text-sm text-muted">
        Os lembretes e clientes dela, exatamente como estão no painel dela, ficam em{" "}
        <Link href={`/admin/funcionario/${id}`} className="text-primary hover:underline">
          Lembretes e clientes
        </Link>
        .
      </div>
    </div>
  );
}
