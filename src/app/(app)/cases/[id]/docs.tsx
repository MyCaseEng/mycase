"use client";
import { useMemo, useState } from "react";
import type { Case, QLetter } from "@/lib/cases";
import { fmtRef, regCode, type Ref } from "@/lib/refs";
import { caseDocs, docVars, courtAddr, partyAddr, LETTERS, sideLabel, sideOfCase, type DocItem, type LetterKey, type OfficeInfo, type ProcRow } from "@/lib/docs";
import { fillTemplate, saveBlob, safeName, DOCX_MIME } from "@/lib/docx";
import { fmtD, normRole, srcOf, todayStr, caseRef } from "@/lib/format";
import { Modal, inputCls } from "@/components/ui";
import { getTemplate, logDoc } from "../doc-actions";
import { issueRef } from "../../refs/actions";

const panel = "rounded-2xl border border-line bg-white p-5";

type Props = { c: Case; letters: QLetter[]; refs: Ref[]; prefix: string; office: OfficeInfo; procRows: ProcRow[]; canWrite: boolean; onQuestions: () => void };

export default function DocsPanel({ c, letters, refs, prefix, office, procRows, canWrite, onQuestions }: Props) {
  const docs = useMemo(() => caseDocs(c, letters, refs), [c, letters, refs]);
  const [pick, setPick] = useState<DocItem | null>(null);
  const [letter, setLetter] = useState<{ k: LetterKey; withRef: boolean } | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  async function generate(d: DocItem, ref: string) {
    setBusy(d.key);
    setErr("");
    try {
      if (d.kind === "q" && d.qLetter) {
        const { qLetterVars } = await import("@/lib/docs");
        const t = await getTemplate("questions", srcOf(c) || null);
        if ("error" in t) throw new Error(t.error);
        const v = qLetterVars(c, d.qLetter, ref, office);
        saveBlob(safeName(`أسئلة الخبير ${normRole(d.party?.role)} ${c.case_no ?? ""} ${d.qLetter.letter_date}`) + ".docx", await fillTemplate(t.b64, v.vars, v.lists));
      } else {
        const v = docVars(c, d, ref, office, letters, procRows);
        const t = await getTemplate(v.kind, srcOf(c) || null);
        if ("error" in t) throw new Error(t.error);
        const name = `${d.label}${d.party ? " " + d.party.name.split(" ").slice(0, 3).join(" ") : ""} ${c.case_no ?? ""}${d.ev ? " " + d.ev.date : ""}`;
        saveBlob(safeName(name) + ".docx", await fillTemplate(t.b64, v.vars, v.lists));
      }
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
    if (how === "use") return generate(d, d.ref ? fmtRef(prefix, d.ref) : "");
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
            {d.ref && <div className="mt-1 text-xs text-brand" dir="ltr" style={{ textAlign: "right" }}>{fmtRef(prefix, d.ref)}</div>}
          </button>
        ))}
      </div>
      {err && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}

      {pick && (
        <Modal title={pick.label} onClose={() => setPick(null)} width="max-w-md">
          <p className="mb-2 text-sm text-muted">{caseRef(c)} · {pick.sub}</p>
          <p className="mb-4 text-sm">
            {pick.ref ? (
              <>صدر لهذا المستند الرقم <b dir="ltr">{fmtRef(prefix, pick.ref)}</b>.</>
            ) : (
              "لم يصدر رقم مرجعي لهذا المستند بعد."
            )}
          </p>
          <div className="flex flex-col gap-2">
            {pick.ref && (
              <button onClick={() => choose(pick, "use")} className="rounded-lg bg-ink hover:bg-ink-hover px-4 py-2 font-semibold text-white">
                إنشاء بالرقم {fmtRef(prefix, pick.ref)}
              </button>
            )}
            {canWrite && pick.category && (
              <button onClick={() => choose(pick, "issue")} className={`rounded-lg px-4 py-2 font-semibold ${pick.ref ? "border border-line" : "bg-ink hover:bg-ink-hover text-white"}`}>
                {pick.ref ? "إصدار رقم جديد ثم إنشاء" : `إصدار رقم (${regCode(pick.category)}) ثم إنشاء`}
              </button>
            )}
            <button onClick={() => choose(pick, "none")} className="rounded-lg border border-line px-4 py-2">
              إنشاء بدون رقم
            </button>
          </div>
        </Modal>
      )}
      {letter && (
        <LetterModal c={c} k={letter.k} withRef={letter.withRef} office={office} onClose={() => setLetter(null)} />
      )}
    </section>
  );
}

function LetterModal({ c, k, withRef, office, onClose }: { c: Case; k: LetterKey; withRef: boolean; office: OfficeInfo; onClose: () => void }) {
  const L = LETTERS[k];
  const hearings = c.events.filter((e) => e.type === "جلسة").map((e) => e.date).sort();
  const nextH = hearings.find((d) => d >= todayStr()) ?? "";
  const needH = k === "postpone" || k === "both", needA = k === "deposit" || k === "both", needR = k !== "start";
  const [to, setTo] = useState("court");
  const [o, setO] = useState({ date: todayStr(), hearing: nextH, period: "", amount: "", payer: sideLabel(c, 1), reason: "" });
  const [subject, setSubject] = useState(L.subj(c));
  const [body, setBody] = useState(L.body(c, o));
  const [edited, setEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k2: keyof typeof o, v: string) => {
    const n = { ...o, [k2]: v };
    setO(n);
    if (!edited) setBody(L.body(c, n));
  };
  const sides = [...sideOfCase(c, 1), ...sideOfCase(c, 2)];
  async function create() {
    if (!body.trim()) return setErr("نص الكتاب فارغ.");
    setBusy(true);
    try {
      let ref = "";
      if (withRef) {
        const r = await issueRef(c.id, L.cat, `${L.label}`, null);
        if (r?.ok) ref = r.ref!;
      }
      const a = to === "court" ? courtAddr(c) : partyAddr(sides.find((p) => p.id === to)!, !!sides.find((p) => p.id === to)?.lawyer);
      const t = await getTemplate("letter", srcOf(c) || null);
      if ("error" in t) throw new Error(t.error);
      const blob = await fillTemplate(
        t.b64,
        { DATE: fmtD(o.date), REF: ref || "……………", TITLE: a.title, NAME: a.name, HONOR: a.honor, AGENT: a.agent, SUBJECT: subject, EXPERT: office.expertName },
        { BODY: body.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean).flatMap((x) => x.split("\n")) }
      );
      saveBlob(safeName(`${L.label} ${c.case_no ?? ""} ${o.date}`) + ".docx", new Blob([blob], { type: DOCX_MIME }));
      await logDoc(c.id, `أنشأ ${L.label} (Word)`, (ref ? ref + " · " : "") + subject);
      onClose();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <Modal title={L.label} onClose={onClose} width="max-w-3xl">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted">موجَّه إلى</span>
          <select value={to} onChange={(e) => setTo(e.target.value)} className={inputCls}>
            <option value="court">{c.authority || "المحكمة"}{c.circuit ? " — " + c.circuit : ""}</option>
            {sides.map((p) => (
              <option key={p.id} value={p.id}>{normRole(p.role)}: {p.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted">تاريخ الكتاب</span>
          <input type="date" value={o.date} onChange={(e) => set("date", e.target.value)} className={inputCls} />
        </label>
        {needH && (
          <>
            <label className="block text-sm">
              <span className="text-muted">الجلسة المطلوب تأجيلها</span>
              <input type="date" value={o.hearing} onChange={(e) => set("hearing", e.target.value)} className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="text-muted">مدة التأجيل المطلوبة</span>
              <input value={o.period} onChange={(e) => set("period", e.target.value)} placeholder="مثال: شهر واحد" className={inputCls} />
            </label>
          </>
        )}
        {needA && (
          <>
            <label className="block text-sm">
              <span className="text-muted">الأمانة المطلوبة (ر.ق)</span>
              <input inputMode="numeric" dir="ltr" value={o.amount} onChange={(e) => set("amount", e.target.value.replace(/[^\d]/g, ""))} className={inputCls + " text-right"} />
            </label>
            <label className="block text-sm">
              <span className="text-muted">يُلزم بالسداد</span>
              <select value={o.payer} onChange={(e) => set("payer", e.target.value)} className={inputCls}>
                {[...new Set([sideLabel(c, 1), sideLabel(c, 2)])].map((x) => <option key={x}>{x}</option>)}
                <option>الطرفين مناصفة</option>
              </select>
            </label>
          </>
        )}
        {needR && (
          <label className="block text-sm sm:col-span-2">
            <span className="text-muted">السبب (يُدرج في النص)</span>
            <input value={o.reason} onChange={(e) => set("reason", e.target.value)} placeholder="مثال: لعدم ورود ردود الأطراف على أسئلة الخبير حتى تاريخه" className={inputCls} />
          </label>
        )}
        <label className="block text-sm sm:col-span-2">
          <span className="text-muted">الموضوع</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="text-muted">نص الكتاب (يمكنك تعديله قبل الإنشاء)</span>
          <textarea rows={9} value={body} onChange={(e) => { setBody(e.target.value); setEdited(true); }} className={inputCls + " leading-7"} />
        </label>
      </div>
      {withRef && <p className="mt-2 text-xs text-muted">سيصدر رقم مرجعي ({L.cat} · {regCode(L.cat)}) عند الإنشاء.</p>}
      {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
      <button disabled={busy} onClick={create} className="mt-4 rounded-lg bg-ink hover:bg-ink-hover px-6 py-2 font-semibold text-white disabled:opacity-60">
        {busy ? "جارٍ الإنشاء…" : "إنشاء الكتاب (Word)"}
      </button>
    </Modal>
  );
}
