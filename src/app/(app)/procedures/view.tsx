"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Case, QLetter } from "@/lib/cases";
import { procList, procLine, type ProcLine, type ProcRow } from "@/lib/docs";
import { simpleDocx, saveBlob, safeName } from "@/lib/docx";
import { caseRef, fmtD, todayStr } from "@/lib/format";
import { Modal, inputCls } from "@/components/ui";
import Confirm2 from "@/components/confirm2";
import { setProcOverride, saveManualProc, deleteManualProc, setProcNum, logDoc } from "../cases/doc-actions";

type P = { c: Case; letters: QLetter[]; rows: ProcRow[]; options: { id: string; label: string }[]; canWrite: boolean };

export default function ProcView({ c, letters, rows, options, canWrite }: P) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState<ProcLine | "new" | null>(null);
  const [msg, setMsg] = useState("");
  const { vis, hid } = procList(c, letters, rows);
  const title = `${caseRef(c)} — ${c.parties.filter((p) => p.side !== 3).map((p) => p.name).slice(0, 2).join(" ضد ")}`;
  const text = vis.map((x, i) => `${i + 1}- ${procLine(x)}`).join("\n");

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold">إجراءات المأمورية</h1>
      <select value={c.id} onChange={(e) => router.push(`/procedures?case=${e.target.value}`)} className="w-full rounded-lg border border-line bg-white px-3 py-2">
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>

      <section className="rounded-2xl border border-line bg-white p-5">
        <p className="mb-3 text-sm text-muted">
          تُبنى تلقائياً من بيانات الدعوى: التكليف، وإرسال الأسئلة، وتحديد المواعيد، وردود الأطراف، والاجتماعات والمعاينة. يمكنك تعديل أي نص أو إخفاؤه أو إضافة إجراء.
        </p>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <label className="text-sm text-muted">
            ترقيم المستندات{" "}
            <select
              value={c.proc_num ?? "party"}
              disabled={!canWrite || pending}
              onChange={(e) => start(() => setProcNum(c.id, e.target.value as "party" | "time"))}
              className="rounded-lg border border-line px-2 py-1"
            >
              <option value="party">حسب الطرف</option>
              <option value="time">حسب التسلسل الزمني</option>
            </select>
          </label>
          <span className="flex-1" />
          {canWrite && (
            <button onClick={() => setEdit("new")} className="rounded-lg border border-line px-3 py-1.5 text-sm">+ إضافة إجراء</button>
          )}
          <button onClick={async () => { await navigator.clipboard.writeText(text); setMsg("نُسخ النص"); setTimeout(() => setMsg(""), 2000); }} className="rounded-lg border border-line px-3 py-1.5 text-sm">
            نسخ النص
          </button>
          <button
            onClick={async () => {
              saveBlob(safeName(`إجراءات المأمورية ${c.case_no ?? ""}`) + ".docx", simpleDocx("إجراءات المأمورية", title, vis.map(procLine)));
              await logDoc(c.id, "صدّر إجراءات المأمورية (Word)", "");
            }}
            className="rounded-lg bg-ink hover:bg-ink-hover px-3 py-1.5 text-sm font-semibold text-white"
          >
            تصدير Word
          </button>
          <Link href={`/cases/${c.id}`} className="text-sm text-brand hover:underline">فتح الدعوى ←</Link>
          {msg && <span className="text-sm text-green-700">{msg}</span>}
        </div>

        <ol className="space-y-2">
          {vis.map((x, i) => (
            <li key={x.key} className={`flex gap-3 rounded-lg p-3 text-sm leading-7 ${x.man ? "bg-amber-50" : "bg-background"}`}>
              <b className="shrink-0">{i + 1}-</b>
              <div className="flex-1">
                في تاريخ <b>{fmtD(x.date)}</b> {x.text}
                {x.att && (
                  <>
                    ، مرفق <span className="font-semibold text-brand">{x.att} - مستند رقم {x.n}</span>
                  </>
                )}
                .{x.edited && <span className="mr-2 rounded bg-white px-1.5 text-xs text-muted">نص معدّل</span>}
                {x.man && <span className="mr-2 rounded bg-white px-1.5 text-xs text-muted">مضاف يدوياً</span>}
              </div>
              {canWrite && (
                <div className="flex shrink-0 items-start gap-1">
                  <button onClick={() => setEdit(x)} title="تعديل النص" className="px-1 text-muted hover:text-brand">✎</button>
                  {x.man ? (
                    <Confirm2 label="حذف" confirmLabel="تأكيد" onConfirm={() => start(() => deleteManualProc(c.id, x.id!))} />
                  ) : (
                    <button onClick={() => start(() => setProcOverride(c.id, x.key, { hidden: true }))} title="إخفاء من القائمة" className="px-1 text-muted hover:text-red-700">⊘</button>
                  )}
                </div>
              )}
            </li>
          ))}
          {!vis.length && <li className="text-sm text-muted">لا توجد إجراءات بعد. سجّل تاريخ الحكم التمهيدي أو الورود في بيانات الدعوى، أو أضف إجراء يدوياً.</li>}
        </ol>
        {hid.length > 0 && (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-muted">إجراءات مخفية ({hid.length})</summary>
            <ul className="mt-2 space-y-1">
              {hid.map((x) => (
                <li key={x.key} className="flex items-center gap-2 rounded-lg bg-background p-2 text-muted">
                  <span className="flex-1">في تاريخ {fmtD(x.date)} {x.text}</span>
                  {canWrite && (
                    <button onClick={() => start(() => (x.man ? saveManualProc(c.id, x.id!, x.date, x.text, x.att ?? "") : setProcOverride(c.id, x.key, { hidden: false })))} className="rounded border border-line px-2 py-0.5 text-xs">
                      إظهار
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
        <p className="mt-4 text-xs text-muted">هذه القائمة تُدرج تلقائياً في قسم الإجراءات وقائمة المرفقات عند إنشاء «تقرير الخبرة» من مستندات ونماذج الخبير.</p>
      </section>

      {edit && <EditProc c={c} x={edit === "new" ? null : edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function EditProc({ c, x, onClose }: { c: Case; x: ProcLine | null; onClose: () => void }) {
  const manual = !x || !!x.man;
  const [date, setDate] = useState(x?.date ?? todayStr());
  const [text, setText] = useState(x?.text ?? "");
  const [att, setAtt] = useState(x?.att ?? "");
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const t = text.trim().replace(/\.$/, "");
      if (!t) return;
      if (manual) await saveManualProc(c.id, x?.id ?? null, date, t, att.trim());
      else await setProcOverride(c.id, x!.key, { body: t });
      onClose();
    });
  return (
    <Modal title={x ? "تعديل نص الإجراء" : "إضافة إجراء"} onClose={onClose}>
      {manual ? (
        <label className="block text-sm">
          <span className="text-muted">التاريخ</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </label>
      ) : (
        <p className="text-sm text-muted">التاريخ والمستند المرفق يبقيان تلقائيين. عدّل نص الإجراء فقط.</p>
      )}
      <label className="mt-3 block text-sm">
        <span className="text-muted">نص الإجراء (بعد «في تاريخ ...»)</span>
        <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} className={inputCls + " leading-7"} />
      </label>
      {manual && (
        <label className="mt-3 block text-sm">
          <span className="text-muted">المستند المرفق (اختياري)</span>
          <input value={att} onChange={(e) => setAtt(e.target.value)} placeholder="مثال: مذكرة تعقيب المدعية" className={inputCls} />
        </label>
      )}
      <div className="mt-4 flex gap-2">
        <button disabled={pending} onClick={save} className="rounded-lg bg-ink hover:bg-ink-hover px-5 py-2 font-semibold text-white">حفظ</button>
        {x?.edited && (
          <button onClick={() => start(async () => { await setProcOverride(c.id, x.key, { body: null }); onClose(); })} className="rounded-lg border border-line px-4 py-2">
            إرجاع النص التلقائي
          </button>
        )}
      </div>
    </Modal>
  );
}
