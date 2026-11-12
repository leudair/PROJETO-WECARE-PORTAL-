import { PageHeader } from "@/components/page-header";
import { CriarCodigoForm } from "@/components/assinatura-form";
import { definirCodigoAction } from "@/lib/actions/assinatura";
import { temCodigo } from "@/lib/data/portal";

export default async function MeuCodigoPage() {
  const possui = await temCodigo();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Meu código de assinatura"
        description="É com ele que você (ou a gerente) assina os relatórios das vendedoras. Fica guardado embaralhado: ninguém consegue ler."
      />
      <div className="card-glass p-8">
        <CriarCodigoForm action={definirCodigoAction} trocar={Boolean(possui)} />
      </div>
    </div>
  );
}
