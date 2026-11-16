"use client";
import { useState, useTransition } from "react";
import type { Case } from "@/lib/cases";
import type { Extracted } from "@/lib/extract";
import ImportPdf from "@/components/import-pdf";
import { Modal } from "@/components/ui";
import { fmtD, normCaseNo, normRole } from "@/lib/format";
import { applyImportToCase, sourceFileUrl } from "../actions";

const LABELS: Record<string, string> = {
  case_no: "رقم الدعوى", case_type: "نوع الدعوى", authority: "الجهة", circuit: "الدائرة", judge: "القاضي", secretary: "أمين السر",
  mission: "رقم المأمورية", received: "تاريخ الورود", prelim_date: "تاريخ الحكم التمهيدي", deadline: "الموعد النهائي", due_note: "المهلة",
  deposit_ordered: "الأمانة المقررة", claim_value: "قيمة المطالبة", project_value: "قيمة المشروع",
};
const norm = (n: string) => n.replace(/[ً-ْـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/\s+/g, " ").trim();

// Fill what the case is missing from a newer file (typically the preliminary judgment). Nothing is overwritten.
export function UpdateFromPdf({ c, officeId }: { c: Case; officeId: string }) {
  const [open, setOpen] = useState(false);
  const [diff, setDiff] = useState<null | { patch: Record<string, string | number | null>; parties: Extracted["parties"]; sessions: Extracted["sessions"]; path: string; ex: Extracted }>(null);
  const [pending, start] = useTransition();
  const [done, setDone] = useState("");

  function compare(ex: Extracted, path: string) {
    const patch: Record<string, string | number | null> = {};
    (Object.keys(LABELS) as (keyof Case & keyof Extracted)[]).forEach((k) => {
      const cur = c[k] as unknown;
      const nv = ex[k] as unknown;
      if ((cur == null || cur === "") && nv != null && nv !== "") patch[k] = nv as string | number;
    });
    const have = new Set(c.parties.map((p) => norm(p.name)));
    const parties = ex.parties.filter((p) => !have.has(norm(p.name)));
    const dates = new Set(c.events.filter((e) => e.type === "جلسة").map((e) => e.date));
    const sessions = ex.sessions.filter((s) => !dates.has(s.date));
    setDiff({ patch, parties, sessions, path, ex });
  }

  const nothing = diff && !Object.keys(diff.patch).length && !diff.parties.length && !diff.sessions.length;
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-background">
        ⇪ تحديث من PDF
      </button>
      {open && (
        <Modal title="تحديث الدعوى من ملف PDF" onClose={() => { setOpen(false); setDiff(null); }}>
          {!diff ? (
            <>
              <p className="mb-3 text-sm text-muted">مثلاً عند وصول الحكم التمهيدي بعد صحيفة الدعوى. تُملأ الحقول الفارغة فقط، وتُضاف الأطراف والجلسات الجديدة، ولا يُستبدل شيء موجود.</p>
              <ImportPdf officeId={officeId} folder={c.id} onDone={compare} label="اختر ملف PDF" />
            </>
          ) : nothing ? (
            <p className="text-sm">لم يُعثر في الملف على معلومة جديدة غير موجودة في الدعوى.{diff.ex.warnings && <span className="block text-amber-800">⚠ {diff.ex.warnings}</span>}</p>
          ) : (
            <div className="space-y-3 text-sm">
              {diff.ex.judgmentPages && <p>الحكم التمهيدي في الصفحات: <b>{diff.ex.judgmentPages}</b></p>}
              {Object.keys(diff.patch).length > 0 && (
                <div className="rounded-lg border border-line p-3">
                  <b>حقول ستُملأ:</b>
                  <ul className="mt-1 space-y-0.5">
                    {Object.entries(diff.patch).map(([k, v]) => (
                      <li key={k}>{LABELS[k]}: <b>{k === "case_no" ? normCaseNo(String(v)) : /_date$|received|deadline/.test(k) ? fmtD(String(v)) : String(v)}</b></li>
                    ))}
                  </ul>
                </div>
              )}
              {diff.parties.length > 0 && (
                <div className="rounded-lg border border-line p-3">
                  <b>أطراف جديدة:</b>
                  <ul className="mt-1">{diff.parties.map((p, i) => <li key={i}>{normRole(p.role)}: {p.name}</li>)}</ul>
                </div>
              )}
              {diff.sessions.length > 0 && (
                <div className="rounded-lg border border-line p-3">
                  <b>جلسات جديدة:</b>
                  <ul className="mt-1">{diff.sessions.map((s, i) => <li key={i}>{fmtD(s.date)} · {s.note}</li>)}</ul>
                </div>
              )}
              {diff.ex.warnings && <p className="text-amber-800">⚠ {diff.ex.warnings}</p>}
              <button
                disabled={pending}
                onClick={() => start(async () => { const r = await applyImportToCase(c.id, diff.patch, diff.parties, diff.sessions, c.source_file ? null : diff.path); setDone(r?.text ?? ""); setOpen(false); setDiff(null); })}
                className="rounded-lg bg-brand px-5 py-2 font-semibold text-white"
              >
                تطبيق على الدعوى
              </button>
            </div>
          )}
        </Modal>
      )}
      {done && <span className="text-sm text-green-700">{done}</span>}
    </>
  );
}

export function SourceFileLink({ caseId }: { caseId: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => { setBusy(true); const u = await sourceFileUrl(caseId); setBusy(false); if (u) window.open(u, "_blank"); }}
      className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-background"
    >
      📎 ملف الدعوى (PDF)
    </button>
  );
}
