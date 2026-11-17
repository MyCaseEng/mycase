"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import ImportPdf from "@/components/import-pdf";
import type { Extracted } from "@/lib/extract";
import { createImportedCase, type Res } from "../actions";
import CaseFields from "../case-fields";
import NewCaseForm from "./form";
import { Msg, inputCls } from "@/components/ui";
import { ROLES1, ROLES2, ROLES3, normCaseNo } from "@/lib/format";

type Existing = { id: string; caseNo: string; label: string; names: string[] };
const norm = (n: string) => n.replace(/[ً-ْـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/\s+/g, " ").trim();

export default function NewCase({ officeId, existing }: { officeId: string; existing: Existing[] }) {
  const [ex, setEx] = useState<{ ex: Extracted; path: string } | null>(null);
  const [manual, setManual] = useState(false);
  if (ex) return <Review officeId={officeId} ex={ex.ex} path={ex.path} existing={existing} onReset={() => setEx(null)} />;
  return (
    <div className="space-y-4">
      <ImportPdf officeId={officeId} folder="imports" onDone={(e, p) => setEx({ ex: e, path: p })} />
      {manual ? (
        <NewCaseForm />
      ) : (
        <button onClick={() => setManual(true)} className="text-sm text-muted underline-offset-4 hover:underline">
          أو أدخل الدعوى يدوياً
        </button>
      )}
    </div>
  );
}

function Review({ ex, path, existing, onReset }: { officeId: string; ex: Extracted; path: string; existing: Existing[]; onReset: () => void }) {
  const [parties, setParties] = useState(ex.parties.map((p) => ({ ...p })));
  const [sessions, setSessions] = useState(ex.sessions.map((s) => ({ ...s })));
  const [res, action, pending] = useActionState<Res, FormData>(createImportedCase, null);
  const sameNo = ex.case_no ? existing.find((e) => e.caseNo && e.caseNo === normCaseNo(ex.case_no)) : undefined;
  const mine = new Set(parties.map((p) => norm(p.name)));
  const sameParties = existing.filter((e) => e !== sameNo && e.names.filter((n) => mine.has(norm(n))).length >= Math.min(2, mine.size) && mine.size > 0);
  const setP = (i: number, k: string, v: string) => setParties(parties.map((p, j) => (j === i ? { ...p, [k]: v } : p)));

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="parties_json" value={JSON.stringify(parties)} />
      <input type="hidden" name="sessions_json" value={JSON.stringify(sessions)} />
      <input type="hidden" name="source_file" value={path} />

      <div className="rounded-xl border border-gold/40 bg-gold-soft p-4 text-sm leading-7">
        <b>استُخرجت البيانات من الملف.</b> راجع الحقول وصحّح ما يلزم، ثم احفظ. لن يُحفظ شيء قبل الضغط على «حفظ الدعوى».
        {ex.judgmentPages && <div>الحكم التمهيدي في الصفحات: <b>{ex.judgmentPages}</b></div>}
        {"pages" in ex && (ex as { pages: number }).pages > 25 && <div className="text-muted">الملف {(ex as { pages: number }).pages} صفحة؛ بُحث فيه كله ثم قُرئت بدقة {(ex as unknown as { read: number }).read} صفحة مهمة.</div>}
        {ex.summary && <div className="text-muted">ملخص: {ex.summary}</div>}
        {ex.warnings && <div className="text-amber-800">⚠ {ex.warnings}</div>}
        {!ex.case_no && <div className="text-amber-800">⚠ لم يُعثر على رقم الدعوى في الملف. أدخله يدوياً إن كان لديك.</div>}
        {sameNo && (
          <div className="mt-2 rounded-lg bg-red-50 p-2 text-red-800">
            ⚠ يوجد في المنصة دعوى بالرقم نفسه: <Link href={`/cases/${sameNo.id}`} className="font-semibold underline">{sameNo.label}</Link>. لتحديثها افتحها واضغط «تحديث من PDF» بدل إنشاء دعوى مكررة.
          </div>
        )}
        {sameParties.length > 0 && (
          <div className="mt-2 rounded-lg bg-amber-100 p-2 text-amber-900">
            ⚠ يوجد في المنصة دعوى بنفس الأطراف: {sameParties.map((e) => <Link key={e.id} href={`/cases/${e.id}`} className="font-semibold underline">{e.label}</Link>)}. تأكد أنها ليست مكررة.
          </div>
        )}
      </div>

      <section className="space-y-2 rounded-xl border border-line bg-white p-5">
        <h2 className="font-semibold">الأطراف ({parties.length})</h2>
        <datalist id="rolesAll">{[...ROLES1, ...ROLES2, ...ROLES3].map((r) => <option key={r} value={r} />)}</datalist>
        {parties.map((p, i) => (
          <div key={i} className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-[9rem_1fr_auto]">
            <input value={p.role} list="rolesAll" onChange={(e) => setP(i, "role", e.target.value)} className={inputCls + " mt-0"} />
            <input value={p.name} onChange={(e) => setP(i, "name", e.target.value)} className={inputCls + " mt-0 font-semibold"} />
            <button type="button" onClick={() => setParties(parties.filter((_, j) => j !== i))} className="text-sm text-red-700">حذف</button>
            <div className="grid gap-2 text-xs sm:col-span-3 sm:grid-cols-3">
              <input value={p.lawyer} placeholder="المحامي" onChange={(e) => setP(i, "lawyer", e.target.value)} className={inputCls + " mt-0"} />
              <input value={p.email || p.lawyer_email} dir="ltr" placeholder="البريد" onChange={(e) => setP(i, p.email ? "email" : "lawyer_email", e.target.value)} className={inputCls + " mt-0"} />
              <input value={p.phone || p.lawyer_phone} dir="ltr" placeholder="الهاتف" onChange={(e) => setP(i, p.phone ? "phone" : "lawyer_phone", e.target.value)} className={inputCls + " mt-0"} />
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setParties([...parties, { role: "طرف آخر", side: 3, name: "", kind: "", phone: "", email: "", lawyer: "", lawyer_phone: "", lawyer_email: "" }])} className="rounded-lg border border-line px-3 py-1.5 text-sm">
          + طرف
        </button>
      </section>

      <section className="space-y-2 rounded-xl border border-line bg-white p-5">
        <h2 className="font-semibold">الجلسات ({sessions.length})</h2>
        {sessions.map((s, i) => (
          <div key={i} className="flex flex-wrap gap-2">
            <input type="date" value={s.date} onChange={(e) => setSessions(sessions.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} className={inputCls + " mt-0 w-auto"} />
            <input value={s.note} onChange={(e) => setSessions(sessions.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} className={inputCls + " mt-0 flex-1"} />
            <button type="button" onClick={() => setSessions(sessions.filter((_, j) => j !== i))} className="text-sm text-red-700">حذف</button>
          </div>
        ))}
        {!sessions.length && <p className="text-sm text-amber-700">لم يُعثر على تاريخ جلسة في الملف. أضفه يدوياً إن وُجد.</p>}
        <button type="button" onClick={() => setSessions([...sessions, { date: "", note: "" }])} className="rounded-lg border border-line px-3 py-1.5 text-sm">+ جلسة</button>
      </section>

      <div className="rounded-xl border border-line bg-white p-5">
        <CaseFields c={{ ...ex, parties: [], assign_src: null } as never} />
      </div>
      <Msg res={res} />
      <div className="flex gap-3">
        <button disabled={pending} className="rounded-lg bg-brand px-6 py-2.5 font-semibold text-white disabled:opacity-60">
          {pending ? "جارٍ الحفظ…" : "حفظ الدعوى"}
        </button>
        <button type="button" onClick={onReset} className="rounded-lg border border-line px-4 py-2">ملف آخر</button>
      </div>
    </form>
  );
}
