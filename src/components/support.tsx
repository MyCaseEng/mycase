"use client";
// The help button in every office: write to the platform owner and see the answers.
import { useActionState, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Modal, Msg, inputCls } from "@/components/ui";
import { myTickets, sendTicket, type Ticket } from "@/lib/support-actions";
import { fmtD } from "@/lib/format";

export const KIND_LABEL: Record<string, string> = { problem: "مشكلة", suggestion: "اقتراح", question: "استفسار" };

export function SupportForm({ onSent }: { onSent?: () => void }) {
  const path = usePathname();
  const [res, action, pending] = useActionState(async (s: unknown, f: FormData) => {
    const r = await sendTicket(s, f);
    if (r.ok) onSent?.();
    return r;
  }, null);
  return (
    <form action={action} key={res?.ok ? "sent" : "form"} className="space-y-3">
      <input type="hidden" name="page" value={path} />
      <div className="flex flex-wrap gap-3 text-sm">
        {Object.entries(KIND_LABEL).map(([k, l]) => (
          <label key={k} className="flex items-center gap-1.5">
            <input type="radio" name="kind" value={k} defaultChecked={k === "problem"} /> {l}
          </label>
        ))}
      </div>
      <input name="subject" required maxLength={200} placeholder="العنوان باختصار" className={inputCls} />
      <textarea name="body" required rows={5} maxLength={5000} placeholder="اشرح المشكلة أو الاقتراح بالتفصيل: ماذا فعلت، وماذا ظهر لك…" className={inputCls + " leading-7"} />
      <div className="flex items-center gap-3">
        <button disabled={pending} className="rounded-lg bg-ink px-5 py-2 font-semibold text-white hover:bg-ink-hover disabled:opacity-60">
          {pending ? "جارٍ الإرسال…" : "إرسال"}
        </button>
        <Msg res={res} />
      </div>
    </form>
  );
}

export function TicketList({ list }: { list: Ticket[] }) {
  if (!list.length) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">رسائلك السابقة</h4>
      {list.map((t) => (
        <div key={t.id} className="rounded-lg border border-line p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-background px-2 text-xs">{KIND_LABEL[t.kind] ?? t.kind}</span>
            <b className="flex-1">{t.subject}</b>
            <span className={`text-xs ${t.status === "done" ? "text-green-700" : "text-amber-700"}`}>{t.status === "done" ? "تمت المعالجة" : "قيد المتابعة"}</span>
            <span className="text-xs text-muted">{fmtD(t.created_at)}</span>
          </div>
          {t.reply && (
            <div className="mt-2 rounded-md bg-brand-soft p-2 leading-7">
              <span className="text-xs font-semibold text-brand">رد إدارة المنصة · {fmtD(t.replied_at)}</span>
              <div className="whitespace-pre-line">{t.reply}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function SupportButton() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Ticket[]>([]);
  const load = () => myTickets().then(setList);
  useEffect(() => {
    if (open) load();
  }, [open]);
  const unread = list.some((t) => t.reply && t.status === "done");
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="الدعم والمساعدة: مشكلة، اقتراح، أو استفسار"
        aria-label="الدعم والمساعدة"
        className="relative flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-sm hover:border-brand"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M9.6 9.3a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.2-2.4 3.7M12 17h.01" />
          </g>
        </svg>
        <span className="hidden sm:inline">الدعم</span>
        {unread && <span className="absolute -left-1 -top-1 size-2.5 rounded-full bg-brand" />}
      </button>
      {open && (
        <Modal title="الدعم والمساعدة" onClose={() => setOpen(false)} width="max-w-xl">
          <p className="mb-3 text-sm text-muted">واجهتك مشكلة أو عندك اقتراح لتحسين المنصة؟ اكتب لنا هنا، وتصل رسالتك مباشرة إلى إدارة المنصة، ويظهر الرد في هذه النافذة.</p>
          <SupportForm onSent={load} />
          <div className="mt-5">
            <TicketList list={list} />
          </div>
        </Modal>
      )}
    </>
  );
}
