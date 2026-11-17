"use client";
import { useRef, useState, useTransition } from "react";
import Confirm2 from "@/components/confirm2";
import { fmtD } from "@/lib/format";
import { uploadTemplate, deleteTemplate } from "./template-actions";

type Item = { src: string | null; fileName: string | null; updatedAt: string | null };

// One kind of document: the general template, plus optional ones per assigning body (different letterhead).
export default function TemplateRow({ kind, label, items, srcs, isAdmin }: { kind: string; label: string; items: Item[]; srcs: string[][]; isAdmin: boolean }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const [addSrc, setAddSrc] = useState("");
  const general = items.find((i) => !i.src);
  const special = items.filter((i) => i.src);
  const srcName = (s: string | null) => srcs.find(([v]) => v === s)?.[1] ?? "";

  return (
    <div className="space-y-2 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <b className="flex-1">{label}</b>
        {general ? (
          <span className="text-xs text-green-700">✓ قالب المكتب: {general.fileName} · {fmtD(general.updatedAt)}</span>
        ) : (
          <span className="text-xs text-muted">
            النموذج القياسي ·{" "}
            <a href={`/forms/${kind}.docx`} download={`${label}.docx`} className="text-brand hover:underline">
              تنزيل للاطلاع
            </a>
          </span>
        )}
        {isAdmin && <Upload kind={kind} pending={pending} run={(fd, src) => start(async () => setErr(await uploadTemplate(kind, src, fd)))} src={null} text={general ? "استبدال" : "رفع قالب خاص بالمكتب"} />}
        {isAdmin && general && <Confirm2 label="العودة للقياسي" confirmLabel="تأكيد" onConfirm={() => start(() => deleteTemplate(kind, null))} />}
      </div>
      {special.map((t) => (
        <div key={t.src} className="flex flex-wrap items-center gap-2 pr-4 text-xs">
          <span className="flex-1 text-muted">قالب خاص: {srcName(t.src)}</span>
          <span className="text-green-700">✓ {t.fileName}</span>
          {isAdmin && (
            <>
              <Upload kind={kind} pending={pending} run={(fd, src) => start(async () => setErr(await uploadTemplate(kind, src, fd)))} src={t.src} text="استبدال" />
              <Confirm2 label="حذف" confirmLabel="تأكيد" onConfirm={() => start(() => deleteTemplate(kind, t.src))} />
            </>
          )}
        </div>
      ))}
      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2 pr-4 text-xs">
          <select value={addSrc} onChange={(e) => setAddSrc(e.target.value)} className="rounded-lg border border-line px-2 py-1">
            <option value="">+ قالب بترويسة خاصة لجهة تكليف…</option>
            {srcs.filter(([v]) => !special.some((s) => s.src === v)).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          {addSrc && <Upload kind={kind} pending={pending} run={(fd, src) => start(async () => setErr(await uploadTemplate(kind, src, fd)))} src={addSrc} text={`رفع قالب ${srcName(addSrc)}`} />}
        </div>
      )}
      {err && <p className="text-xs text-red-700">{err}</p>}
    </div>
  );
}

function Upload({ src, text, pending, run }: { kind: string; src: string | null; text: string; pending: boolean; run: (fd: FormData, src: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept=".docx"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const fd = new FormData();
          fd.append("file", f);
          run(fd, src);
          e.target.value = "";
        }}
      />
      <button type="button" disabled={pending} onClick={() => ref.current?.click()} className="rounded-lg border border-line px-3 py-1 text-xs hover:bg-background">
        {text}
      </button>
    </>
  );
}
