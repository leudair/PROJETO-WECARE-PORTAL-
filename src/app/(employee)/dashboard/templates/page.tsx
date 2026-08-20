import { listTemplates } from "@/lib/data/contacts";

export default async function TemplatesPage() {
  const templates = await listTemplates();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Mensagens do funil de lead</h2>
        <p className="text-sm text-muted">
          Copie o texto da tentativa correspondente e cole na conversa com o cliente.
        </p>
      </div>

      <div className="space-y-3">
        {templates.map((template) => (
          <div key={template.stage} className="rounded-xl border border-border bg-surface p-4">
            <p className="mb-2 text-xs font-semibold uppercase text-muted">
              {template.stage}ª tentativa
            </p>
            <p className="whitespace-pre-wrap text-sm text-foreground">
              {template.body || <span className="text-muted">Ainda sem texto cadastrado.</span>}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
