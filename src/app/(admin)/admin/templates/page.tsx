import { listTemplates } from "@/lib/data/contacts";
import { saveTemplateAction } from "./actions";

export default async function AdminTemplatesPage() {
  const templates = await listTemplates();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Mensagens do funil de lead</h1>
        <p className="text-sm text-muted">
          Texto sugerido para cada tentativa de contato com um lead. Os funcionários só copiam e colam.
        </p>
      </div>

      <div className="space-y-3">
        {templates.map((template) => (
          <form
            key={template.stage}
            action={saveTemplateAction}
            className="space-y-2 rounded-xl border border-border bg-surface p-4"
          >
            <input type="hidden" name="stage" value={template.stage} />
            <label className="text-xs font-semibold uppercase text-muted">
              {template.stage}ª tentativa
            </label>
            <textarea
              name="body"
              defaultValue={template.body}
              rows={3}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              Salvar
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
