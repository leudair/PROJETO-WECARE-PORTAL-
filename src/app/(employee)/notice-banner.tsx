import { listOwnUnreadNotices } from "@/lib/data/notices";
import { dismissNoticeAction } from "./dashboard/actions";

export async function NoticeBanner() {
  const notices = await listOwnUnreadNotices();

  if (notices.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      {notices.map((notice) => (
        <div
          key={notice.id}
          className="flex items-start justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground"
        >
          <p className="whitespace-pre-wrap">{notice.message}</p>
          <form action={dismissNoticeAction.bind(null, notice.id)}>
            <button type="submit" className="shrink-0 text-xs text-muted hover:text-foreground">
              Marcar como lido
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}
