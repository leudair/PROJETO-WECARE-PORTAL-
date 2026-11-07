import { listTemplates } from "@/lib/data/contacts";
import { saveTemplateAction } from "./actions";
import { PageHeader } from "@/components/page-header";

export default async function AdminTemplatesPage() {
  const templates = await listTemplates();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mensagens do funil de lead"
        description="Texto sugerido para cada tentativa de contato com um lead. Os funcionários só copiam e colam."
      />

      <div className="space-y-3">
        {templates.map((template) => (
          <form key={template.stage} action={saveTemplateAction} className="card-glass space-y-2.5 p-5">
            <input type="hidden" name="stage" value={template.stage} />
            <div className="flex items-center gap-2.5">
              <span className="icon-orb h-7 w-7 shrink-0 text-xs font-bold text-white">{template.stage}ª</span>
              <label className="text-sm font-bold text-foreground">{template.stage}ª tentativa</label>
            </div>
            <textarea
              name="body"
              defaultValue={template.body}
              rows={3}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="btn-glossy rounded-lg px-3 py-1.5 text-xs font-bold text-primary-foreground"
            >
              Salvar
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
