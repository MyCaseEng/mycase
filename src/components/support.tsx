"use client";
// The help button in every office: write to the platform owner and see the answers.
import { useActionState, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Modal, Msg, inputCls } from "@/components/ui";
import { myTickets, sendTicket, type Att, type Ticket } from "@/lib/support-actions";
import { createClient } from "@/lib/supabase/client";
import { fmtD } from "@/lib/format";
import { KIND_LABEL } from "@/lib/support";


const MAX_FILES = 5;
const MAX_MB = 10;
const OK_TYPE = /^(image\/(png|jpeg|webp|gif)|application\/pdf)$/;

export function SupportForm({ onSent }: { onSent?: () => void }) {
  const path = usePathname();
  const [files, setFiles] = useState<File[]>([]);
  const [warn, setWarn] = useState("");
  const pick = useRef<HTMLInputElement>(null);
  const add = (list: File[]) => {
    const ok = list.filter((f) => OK_TYPE.test(f.type) && f.size <= MAX_MB * 1024 * 1024);
    setWarn(ok.length < list.length ? `يُقبل فقط: صور (PNG، JPG) أو PDF، حتى ${MAX_MB} ميغابايت للملف.` : "");
    setFiles((cur) => [...cur, ...ok].slice(0, MAX_FILES));
  };
  const [res, action, pending] = useActionState(async (s: unknown, f: FormData) => {
    // upload the attachments first (straight from the browser into the sender's own folder), then send the message
    f.delete("file");
    if (files.length) {
      const sb = createClient();
      const { data } = await sb.auth.getUser();
      if (!data.user) return { ok: false, text: "انتهت الجلسة، سجّل الدخول من جديد." };
      for (const file of files) {
        const ext = (file.name.split(".").pop() || (file.type === "application/pdf" ? "pdf" : "png")).toLowerCase().replace(/[^a-z0-9]/g, "");
        const key = `${data.user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await sb.storage.from("support-files").upload(key, file, { contentType: file.type });
        if (error) return { ok: false, text: `تعذّر رفع «${file.name}»: ${error.message}` };
        f.append("file", `${key}::${file.name || "صورة.png"}`);
      }
    }
    const r = await sendTicket(s, f);
    if (r.ok) {
      setFiles([]);
      onSent?.();
    }
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
      <textarea
        name="body"
        required
        rows={5}
        maxLength={5000}
        placeholder="اشرح المشكلة أو الاقتراح بالتفصيل: ماذا فعلت، وماذا ظهر لك… (يمكنك لصق لقطة شاشة هنا بـ Ctrl+V)"
        onPaste={(e) => {
          const imgs = [...e.clipboardData.files].filter((f) => f.type.startsWith("image/"));
          if (imgs.length) {
            e.preventDefault();
            add(imgs.map((f, i) => new File([f], f.name && f.name !== "image.png" ? f.name : `لقطة شاشة ${files.length + i + 1}.png`, { type: f.type })));
          }
        }}
        className={inputCls + " leading-7"}
      />
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => pick.current?.click()}
            disabled={files.length >= MAX_FILES}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm hover:border-brand disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M21 11.5 12.6 19.9a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" />
            </svg>
            إرفاق صورة أو ملف
          </button>
          <span className="text-xs text-muted">حتى {MAX_FILES} ملفات · صور أو PDF · {MAX_MB} ميغابايت للملف</span>
          <input
            ref={pick}
            type="file"
            multiple
            hidden
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
            onChange={(e) => {
              add([...(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
        </div>
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <span key={i} className="flex items-center gap-1.5 rounded-lg border border-line bg-background px-2 py-1 text-xs">
                {f.type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={URL.createObjectURL(f)} alt="" className="size-8 rounded object-cover" />
                ) : (
                  <span>📄</span>
                )}
                <span className="max-w-40 truncate">{f.name}</span>
                <button type="button" onClick={() => setFiles(files.filter((_, k) => k !== i))} aria-label="إزالة" className="text-muted hover:text-red-700">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {warn && <p className="text-xs text-amber-700">{warn}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button disabled={pending} className="rounded-lg bg-ink px-5 py-2 font-semibold text-white hover:bg-ink-hover disabled:opacity-60">
          {pending ? (files.length ? "جارٍ رفع المرفقات والإرسال…" : "جارٍ الإرسال…") : "إرسال"}
        </button>
        <Msg res={res} />
      </div>
    </form>
  );
}

export function Attachments({ atts }: { atts: Att[] }) {
  if (!atts.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {atts.map((a) => (
        <a key={a.url} href={a.url} target="_blank" rel="noopener" title={a.name} className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1 text-xs hover:border-brand">
          {a.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.url} alt="" className="size-14 rounded object-cover" />
          ) : (
            <span>📄</span>
          )}
          <span className="max-w-36 truncate">{a.name}</span>
        </a>
      ))}
    </div>
  );
}

export function TicketList({ list }: { list: (Ticket & { atts: Att[] })[] }) {
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
          <Attachments atts={t.atts} />
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
  const [list, setList] = useState<(Ticket & { atts: Att[] })[]>([]);
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
