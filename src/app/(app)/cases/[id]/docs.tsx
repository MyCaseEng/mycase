"use client";
import { useMemo, useState } from "react";
import type { Case, QLetter } from "@/lib/cases";
import { refText, showRef, type Ref } from "@/lib/refs";
import { caseDocs, LETTERS, sideLabel, type DocItem, type LetterKey, type OfficeInfo, type ProcRow } from "@/lib/docs";
import { saveBlob, safeName } from "@/lib/docx";
import { courtForm, documentsForm, minutesForm, questionsForm, reportForm, startForm, type Filled } from "@/lib/forms";
import { currencyOf } from "@/lib/countries";
import { makeForm } from "../form-loader";
import { fmtD, srcOf, todayStr, caseRef } from "@/lib/format";
import { Modal, inputCls } from "@/components/ui";
import { logDoc } from "../doc-actions";
import { issueRef } from "../../refs/actions";

const panel = "rounded-2xl border border-line bg-white p-5";

type Props = { c: Case; letters: QLetter[]; refs: Ref[]; prefix: string; office: OfficeInfo; procRows: ProcRow[]; canWrite: boolean; replyDays: number; onQuestions: () => void };

export default function DocsPanel({ c, letters, refs, prefix, office, procRows, canWrite, replyDays, onQuestions }: Props) {
  const docs = useMemo(() => caseDocs(c, letters, refs), [c, letters, refs]);
  const [pick, setPick] = useState<DocItem | null>(null);
  const [letter, setLetter] = useState<{ k: LetterKey; withRef: boolean } | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  // every document is one of the platform's standard forms, unless the office uploaded its own template for it
  async function generate(d: DocItem, ref: string) {
    setBusy(d.key);
    setErr("");
    try {
      let f: Filled;
      if (d.kind === "q" && d.qLetter) f = questionsForm(c, d.qLetter, office, ref);
      else if (d.kind === "start" && d.party) f = startForm(c, d.party, office, ref, replyDays);
      else if (d.kind === "meet" || d.kind === "insp") f = minutesForm(c, d.ev, office, ref, d.party ? [d.party] : d.parties, d.kind === "insp" ? "inspection" : "meeting");
      else if (d.kind === "receipt" || d.kind === "handover") f = documentsForm(d.kind, c, office);
      else f = reportForm(c, office, ref, letters, procRows);
      const name = `${d.label}${d.party ? " " + d.party.name.split(" ").slice(0, 3).join(" ") : ""} ${c.case_no ?? ""}${d.ev ? " " + d.ev.date : ""}`;
      saveBlob(safeName(name) + ".docx", await makeForm(f, srcOf(c) || null, office.country));
      await logDoc(c.id, `أنشأ ${d.label} (Word)`, (ref ? ref + " · " : "") + d.sub);
    } catch (e) {
      setErr((e as Error).message || "تعذّر إنشاء الملف.");
    } finally {
      setBusy("");
    }
  }

  async function issueThen(d: DocItem) {
    const title = `${d.label}${d.party ? " — " + d.party.name : ""}`;
    const r = await issueRef(c.id, d.category!, title, d.ev?.id ?? null);
    if (!r?.ok) return setErr(r?.text ?? "تعذّر إصدار الرقم.");
    await generate(d, r.ref!);
  }

  function choose(d: DocItem, how: "use" | "issue" | "none") {
    setPick(null);
    if (d.kind === "qsetup") return onQuestions();
    if (d.kind === "letter") return setLetter({ k: d.letter!, withRef: how === "issue" });
    if (how === "use") return generate(d, d.ref ? refText(d.ref, prefix) : "");
    if (how === "issue") return issueThen(d);
    return generate(d, "");
  }

  return (
    <section className={panel}>
      <h2 className="mb-3 font-semibold">مستندات ونماذج الخبير</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {docs.map((d) => (
          <button
            key={d.key}
            disabled={!!busy}
            onClick={() => (d.kind === "qsetup" ? onQuestions() : setPick(d))}
            className={`rounded-xl border p-3 text-right transition hover:border-brand ${d.stub || d.kind === "qsetup" ? "border-dashed border-line opacity-70" : "border-line"} ${busy === d.key ? "animate-pulse" : ""}`}
          >
            <div className="text-sm font-semibold">{d.label}</div>
            <div className="text-xs text-muted">{d.sub}</div>
            {d.ref && <div className="mt-1 text-xs text-brand">{showRef(refText(d.ref, prefix))}</div>}
          </button>
        ))}
      </div>
      {err && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}

      {pick && (
        <Modal title={pick.label} onClose={() => setPick(null)} width="max-w-md">
          <p className="mb-2 text-sm text-muted">{caseRef(c)} · {pick.sub}</p>
          <p className="mb-4 text-sm">
            {pick.ref ? (
              <>صدر لهذا المستند الرقم <b>{showRef(refText(pick.ref, prefix))}</b>.</>
            ) : (
              "لم يصدر رقم مرجعي لهذا المستند بعد."
            )}
          </p>
          <div className="flex flex-col gap-2">
            {pick.ref && (
              <button onClick={() => choose(pick, "use")} className="rounded-lg bg-ink hover:bg-ink-hover px-4 py-2 font-semibold text-white">
                إنشاء بالرقم {showRef(refText(pick.ref, prefix))}
              </button>
            )}
            {canWrite && pick.category && (
              <button onClick={() => choose(pick, "issue")} className={`rounded-lg px-4 py-2 font-semibold ${pick.ref ? "border border-line" : "bg-ink hover:bg-ink-hover text-white"}`}>
                {pick.ref ? "إصدار رقم جديد ثم إنشاء" : "إصدار رقم مرجعي ثم إنشاء"}
              </button>
            )}
            <button onClick={() => choose(pick, "none")} className="rounded-lg border border-line px-4 py-2">
              إنشاء بدون رقم
            </button>
          </div>
        </Modal>
      )}
      {letter && (
        <LetterModal c={c} k={letter.k} withRef={letter.withRef} office={office} letters={letters} procRows={procRows} onClose={() => setLetter(null)} />
      )}
    </section>
  );
}

// 05 / 06 / 07: the details the court letter needs; the wording is the platform's standard form
function LetterModal({ c, k, withRef, office, letters, procRows, onClose }: { c: Case; k: LetterKey; withRef: boolean; office: OfficeInfo; letters: QLetter[]; procRows: ProcRow[]; onClose: () => void }) {
  const L = LETTERS[k];
  const kind = k === "deposit" ? "deposit" : k === "both" ? "both" : "postpone";
  const hearings = c.events.filter((e) => e.type === "جلسة").map((e) => e.date).sort();
  const nextH = hearings.find((d) => d >= todayStr()) ?? "";
  const needH = kind !== "deposit", needA = kind !== "postpone";
  const cur = currencyOf(office.country);
  const [o, setO] = useState({ date: todayStr(), hearing: nextH, period: "", amount: "", payer: sideLabel(c, 1), reason: "", reasonDep: "", reasons: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k2: keyof typeof o, v: string) => setO({ ...o, [k2]: v });
  async function create() {
    setBusy(true);
    setErr("");
    try {
      let ref = "";
      if (withRef) {
        const r = await issueRef(c.id, L.cat, L.label, null);
        if (r?.ok) ref = r.ref!;
      }
      const f = courtForm(kind, c, office, ref, { ...o, reasons: o.reasons.split("\n").map((x) => x.trim()).filter(Boolean) }, letters, procRows);
      saveBlob(safeName(`${L.label} ${c.case_no ?? ""} ${o.date}`) + ".docx", await makeForm(f, srcOf(c) || null, office.country));
      await logDoc(c.id, `أنشأ ${L.label} (Word)`, ref || fmtD(o.date));
      onClose();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <Modal title={L.label} onClose={onClose} width="max-w-2xl">
      <p className="mb-3 text-sm text-muted">
        موجَّه إلى {c.authority || "المحكمة"}{c.circuit ? " — " + c.circuit : ""}. اكتب التفاصيل، وتُدرج في النموذج القياسي، ويمكنك تعديل الملف في Word بعد تنزيله.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted">تاريخ الكتاب</span>
          <input type="date" value={o.date} onChange={(e) => set("date", e.target.value)} className={inputCls} />
        </label>
        {needH && (
          <label className="block text-sm">
            <span className="text-muted">الجلسة المحددة لنظر الدعوى</span>
            <input type="date" value={o.hearing} onChange={(e) => set("hearing", e.target.value)} className={inputCls} />
          </label>
        )}
        {needH && (
          <label className="block text-sm">
            <span className="text-muted">مدة التأجيل المطلوبة</span>
            <input value={o.period} onChange={(e) => set("period", e.target.value)} placeholder="مثال: شهر واحد" className={inputCls} />
          </label>
        )}
        {needA && (
          <label className="block text-sm">
            <span className="text-muted">الأمانة المقترحة ({cur[1]})</span>
            <input inputMode="numeric" dir="ltr" value={o.amount} onChange={(e) => set("amount", e.target.value.replace(/[^\d]/g, ""))} className={inputCls + " text-right"} />
          </label>
        )}
        {needA && (
          <label className="block text-sm">
            <span className="text-muted">يُلزم بسداد الفرق</span>
            <select value={o.payer} onChange={(e) => set("payer", e.target.value)} className={inputCls}>
              {[...new Set([sideLabel(c, 1), sideLabel(c, 2)])].map((x) => <option key={x}>{x}</option>)}
              <option>الطرفين مناصفة</option>
            </select>
          </label>
        )}
        {kind !== "deposit" && (
          <label className="block text-sm sm:col-span-2">
            <span className="text-muted">{kind === "both" ? "سبب آخر للتأجيل غير الأمانة (اختياري)" : "سبب التأجيل"}</span>
            <input value={o.reason} onChange={(e) => set("reason", e.target.value)} placeholder="مثال: عدم اكتمال المستندات المطلوبة من الأطراف" className={inputCls} />
          </label>
        )}
        {kind === "deposit" && (
          <label className="block text-sm sm:col-span-2">
            <span className="text-muted">أسباب إعادة التقدير (سبب في كل سطر)</span>
            <textarea rows={4} value={o.reasons} onChange={(e) => set("reasons", e.target.value)} placeholder={"كبر حجم المستندات المطلوب فحصها\nحاجة المأمورية إلى معاينات ميدانية متعددة"} className={inputCls + " leading-7"} />
          </label>
        )}
        {kind === "both" && (
          <label className="block text-sm sm:col-span-2">
            <span className="text-muted">أسباب إعادة تقدير الأمانة</span>
            <input value={o.reasonDep} onChange={(e) => set("reasonDep", e.target.value)} placeholder="مثال: كبر حجم المستندات وتعدد بنود المأمورية" className={inputCls} />
          </label>
        )}
      </div>
      {withRef && <p className="mt-2 text-xs text-muted">سيصدر رقم مرجعي جديد ({L.cat}) عند الإنشاء.</p>}
      {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
      <button disabled={busy} onClick={create} className="mt-4 rounded-lg bg-ink px-6 py-2 font-semibold text-white hover:bg-ink-hover disabled:opacity-60">
        {busy ? "جارٍ الإنشاء…" : "إنشاء الكتاب (Word)"}
      </button>
    </Modal>
  );
}
