import { AssinaturaForm, CriarCodigoForm } from "@/components/assinatura-form";
import { abrirDiaAction, definirCodigoAction } from "@/lib/actions/assinatura";

// Tela que aparece no lugar do painel enquanto a funcionaria nao abriu o dia.
export function AbrirDiaPortao({ nome, possuiCodigo }: { nome: string; possuiCodigo: boolean }) {
  const primeiroNome = nome.replace(/^W\d+\s*-\s*/i, "").split(" ")[0];

  return (
    <div className="mx-auto mt-10 max-w-md">
      <div className="card-glass space-y-5 p-8 text-center">
        <span className="icon-orb mx-auto h-14 w-14 text-2xl text-white">🔒</span>
        {possuiCodigo ? (
          <>
            <div>
              <h1 className="text-xl font-bold text-foreground">Bom dia, {primeiroNome}!</h1>
              <p className="mt-1 text-sm text-muted">
                Digite seu código para abrir o dia. O horário de abertura fica registrado.
              </p>
            </div>
            <div className="flex justify-center">
              <AssinaturaForm action={abrirDiaAction} botao="Abrir o dia" />
            </div>
          </>
        ) : (
          <>
            <div>
              <h1 className="text-xl font-bold text-foreground">Crie seu código de assinatura</h1>
              <p className="mt-1 text-sm text-muted">
                Ele é a sua assinatura no Portal: abre e fecha o seu dia e assina seus relatórios. Só você sabe.
                Ninguém consegue ver, nem a empresa.
              </p>
            </div>
            <CriarCodigoForm action={definirCodigoAction} />
          </>
        )}
      </div>
    </div>
  );
}
