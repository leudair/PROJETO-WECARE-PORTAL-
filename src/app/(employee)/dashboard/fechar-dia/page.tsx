import { requireProfile } from "@/lib/data/auth";
import { expedienteDeHoje, formatarHora, relatorioDeHoje, resumoVendedora } from "@/lib/data/portal";
import { todayInSaoPaulo } from "@/lib/date";
import { AssinaturaForm } from "@/components/assinatura-form";
import { fecharDiaAction } from "@/lib/actions/assinatura";
import { PageHeader } from "@/components/page-header";
import { ResumoCards } from "@/components/resumo-cards";

export default async function FecharDiaPage() {
  const profile = await requireProfile();
  const hoje = todayInSaoPaulo();
  const [expediente, relatorio, resumo] = await Promise.all([
    expedienteDeHoje(profile.id),
    relatorioDeHoje(profile.id),
    resumoVendedora(profile.id, hoje, hoje),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fechar o dia"
        description={`Dia aberto às ${formatarHora(expediente?.aberto_em)}. Confira o resumo e assine para fechar.`}
      />

      {resumo && <ResumoCards resumo={relatorio?.resumo ?? resumo} />}

      <div className="card-glass space-y-3 p-6">
        {relatorio ? (
          <>
            <p className="text-sm font-semibold text-green-400">
              Dia fechado e assinado às {formatarHora(relatorio.assinado_em)}.
            </p>
            {relatorio.observacao && <p className="text-sm text-muted">Sua observação: {relatorio.observacao}</p>}
            <p className="text-xs text-muted">
              {relatorio.gerente_assinado_em
                ? `Conferido e assinado pela gerente às ${formatarHora(relatorio.gerente_assinado_em)}.`
                : "Aguardando a gerente conferir e assinar."}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">
              Ao assinar, o relatório de hoje fica gravado com o seu nome e a hora, e não pode mais ser alterado.
            </p>
            <AssinaturaForm
              action={fecharDiaAction}
              botao="Assinar e fechar o dia"
              observacao="Observações do dia (opcional): o que fez, o que ficou pendente..."
            />
          </>
        )}
      </div>
    </div>
  );
}
