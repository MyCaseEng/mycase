"use client";
import { useActionState, useState, useTransition } from "react";
import type { Case, QLetter } from "@/lib/cases";
import type { Ref } from "@/lib/refs";
import { refText as refLabel, showRef } from "@/lib/refs";
import { fmtD, dayDiff, todayStr, normRole } from "@/lib/format";
import { Field, Modal, Msg, inputCls } from "@/components/ui";
import Confirm2 from "@/components/confirm2";
import { createLetters, updateLetter, markSent, setReply, deleteLetter, issueLetterRef, type QRes } from "../q-actions";
import type { CaseSettings } from "./view";
import { qLetterVars, qMailBody, type OfficeInfo } from "@/lib/docs";
import { saveBlob, safeName, bufToB64, buildEml, DOCX_MIME } from "@/lib/docx";
import { questionsForm } from "@/lib/forms";
import { makeForm } from "../form-loader";
import { caseRef, srcOf } from "@/lib/format";
import { logDoc, setLetterSendTo } from "../doc-actions";

const panel = "rounded-2xl border border-line bg-white p-5";

// Expert questions to the parties: one letter per party, a reply period, and three status buttons.
export default function QuestionsPanel({ c, letters, refs, settings, office, canWrite, openSetup, onSetupClose }: { c: Case; letters: QLetter[]; refs: Ref[]; settings: CaseSettings; office: OfficeInfo; canWrite: boolean; openSetup?: boolean; onSetupClose?: () => void }) {
  const [setupState, setSetup] = useState(false);
  const setup = setupState || !!openSetup;
  const [mail, setMail] = useState<QLetter | null>(null);
  const [edit, setEdit] = useState<QLetter | null>(null);
  const party = (id: string | null) => c.parties.find((p) => p.id === id);
  const refOf = (id: string | null) => refs.find((r) => r.id === id);

  return (
    <section id="questions" className={`${panel} scroll-mt-4`}>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="flex-1 font-semibold">أسئلة واستفسارات الخبير وردود الأطراف</h2>
        {canWrite && (
          <button onClick={() => setSetup(true)} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-background">
            + إعداد خطابات الأسئلة
          </button>
        )}
      </div>
      {!letters.length ? (
        <p className="text-sm text-muted">لم تُرسل أسئلة للأطراف بعد.</p>
      ) : (
        <div className="space-y-2">
          {letters.map((l) => (
            <LetterRow key={l.id} c={c} l={l} partyName={party(l.party_id)?.name ?? l.addressee ?? "—"} partyRole={normRole(party(l.party_id)?.role)} refText={refOf(l.ref_id) ? refLabel(refOf(l.ref_id)!, settings.refPrefix) : ""} canWrite={canWrite} onEdit={() => setEdit(l)} onMail={() => setMail(l)} office={office} />
          ))}
        </div>
      )}
      {setup && <SetupModal c={c} settings={settings} onClose={() => { setSetup(false); onSetupClose?.(); }} />}
      {mail && <MailModal c={c} l={mail} refText={refOf(mail.ref_id) ? refLabel(refOf(mail.ref_id)!, settings.refPrefix) : ""} office={office} onClose={() => setMail(null)} />}
      {edit && <EditModal c={c} l={edit} partyName={party(edit.party_id)?.name ?? ""} hasRef={!!edit.ref_id} onClose={() => setEdit(null)} />}
    </section>
  );
}

async function buildQDoc(c: Case, l: QLetter, refText: string, office: OfficeInfo) {
  const v = qLetterVars(c, l, refText, office);
  return { blob: await makeForm(questionsForm(c, l, office, refText), srcOf(c) || null, office.country), addr: v.addr };
}

function LetterRow({ c, l, partyName, partyRole, refText, canWrite, onEdit, onMail, office }: { c: Case; l: QLetter; partyName: string; partyRole: string; refText: string; canWrite: boolean; onEdit: () => void; onMail: () => void; office: OfficeInfo }) {
  const [pending, start] = useTransition();
  const [werr, setWerr] = useState("");
  const word = async () => {
    setWerr("");
    try {
      const { blob } = await buildQDoc(c, l, refText, office);
      saveBlob(safeName(`أسئلة الخبير ${partyRole} ${c.case_no ?? ""} ${l.letter_date}`) + ".docx", blob);
      await logDoc(c.id, "أنشأ خطاب أسئلة الخبير (Word)", (refText ? refText + " · " : "") + partyName);
    } catch (e) {
      setWerr((e as Error).message);
    }
  };
  const open = !l.reply_date || l.reply_type === "partial";
  const left = l.due ? dayDiff(l.due) : null;
  const tone = !open ? "text-green-700" : left == null ? "" : left < 0 ? "text-red-700 font-semibold" : left <= 1 ? "text-amber-700 font-semibold" : "";
  const status = l.reply_type === "full"
    ? `اكتمل الرد ${fmtD(l.reply_date)}`
    : l.reply_type === "partial"
      ? `رد جزئي ${fmtD(l.reply_date)}`
      : l.sent_at
        ? left != null && left < 0 ? `انتهت المهلة منذ ${-left} يوم` : "بانتظار الرد"
        : "لم يُرسل بعد";
  const b = (on: boolean) => `rounded-lg px-3 py-1.5 text-sm font-semibold ${on ? "bg-ink hover:bg-ink-hover text-white" : "border border-line hover:bg-background"}`;
  return (
    <div className="@container rounded-xl border border-line p-3">
      <div className="grid items-center gap-3 @3xl:grid-cols-[1.4fr_1fr_1fr_auto]">
        <div>
          <div className="text-xs text-muted">{partyRole}</div>
          <div className="font-semibold">{partyName}</div>
        </div>
        <div className="text-sm">
          <div className="text-xs text-muted">أسئلة واستفسارات</div>
          {fmtD(l.letter_date)} {refText && <span className="text-xs text-muted">· {showRef(refText)}</span>}
        </div>
        <div className={`text-sm ${tone}`}>
          <div className="text-xs font-normal text-muted">مهلة الرد</div>
          {l.due ? `${fmtD(l.due)} · ${status}` : status}
        </div>
        {canWrite && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button disabled={pending} onClick={() => start(() => markSent(c.id, l.id, !l.sent_at))} className={b(!!l.sent_at)}>
              {l.sent_at ? "✓ تم الإرسال" : "تم الإرسال"}
            </button>
            <button disabled={pending} onClick={() => start(() => setReply(c.id, l.id, l.reply_type === "partial" ? null : "partial", todayStr()))} className={b(l.reply_type === "partial")}>
              رد جزئي
            </button>
            <button disabled={pending} onClick={() => start(() => setReply(c.id, l.id, l.reply_type === "full" ? null : "full", todayStr()))} className={b(l.reply_type === "full")}>
              اكتمل الرد
            </button>
            <button onClick={word} title="خطاب Word" className="rounded-lg border border-line px-2 py-1.5 text-sm">📄</button>
            <button onClick={onMail} title="إيميل مع المرفق" className="rounded-lg border border-line px-2 py-1.5 text-sm">✉</button>
            <button onClick={onEdit} aria-label="تعديل الخطاب" className="px-2 text-muted hover:text-brand">
              ✎
            </button>
          </div>
        )}
      </div>
      {werr && <p className="mt-2 text-sm text-red-700">{werr}</p>}
    </div>
  );
}

function SetupModal({ c, settings, onClose }: { c: Case; settings: CaseSettings; onClose: () => void }) {
  const tplNames = Object.keys(settings.qTemplates);
  const [tpl, setTpl] = useState(tplNames[0] ?? "");
  const [questions, setQuestions] = useState((settings.qTemplates[tpl] ?? []).join("\n"));
  const main = c.parties.filter((p) => p.side !== 3).sort((a, b) => a.side - b.side || a.sort - b.sort);
  const others = c.parties.filter((p) => p.side === 3);
  const [res, action, pending] = useActionState<QRes, FormData>(async (s, f) => {
    const r = await createLetters(c.id, s, f);
    if (r?.ok) onClose();
    return r;
  }, null);
  return (
    <Modal title="إعداد خطابات الأسئلة" onClose={onClose} width="max-w-3xl">
      <form action={action} className="space-y-4">
        <div>
          <span className="text-sm text-muted">الأطراف (خطاب لكل طرف)</span>
          <div className="mt-1 flex flex-wrap gap-3">
            {[...main, ...others].map((p) => (
              <label key={p.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
                <input type="checkbox" name="party" value={p.id} defaultChecked={p.side !== 3} />
                <span className="text-muted">{normRole(p.role)}:</span> {p.name}
              </label>
            ))}
            {!c.parties.length && <span className="text-sm text-red-700">أضف الأطراف أولاً من بيانات الدعوى.</span>}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="تاريخ الخطاب">
            <input type="date" name="letter_date" defaultValue={todayStr()} className={inputCls} />
          </Field>
          <Field label="مهلة الرد (أيام)">
            <input type="number" name="days" min={1} max={60} defaultValue={settings.defaultReplyDays} className={inputCls} />
          </Field>
          <Field label="قالب الأسئلة">
            <select value={tpl} onChange={(e) => { setTpl(e.target.value); setQuestions((settings.qTemplates[e.target.value] ?? []).join("\n")); }} className={inputCls}>
              {tplNames.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="الأسئلة (سؤال في كل سطر، عدّلها لهذه الدعوى)">
          <textarea name="questions" rows={10} value={questions} onChange={(e) => setQuestions(e.target.value)} className={inputCls + " leading-7"} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="with_ref" defaultChecked /> إصدار رقم مرجعي لكل خطاب
        </label>
        <p className="text-xs text-muted">بعد الإعداد: 📄 لتنزيل الخطاب Word، و✉ لتنزيل مسودة Outlook مع الخطاب مرفقاً.</p>
        <Msg res={res} />
        <button disabled={pending} className="rounded-lg bg-ink hover:bg-ink-hover px-6 py-2 font-semibold text-white disabled:opacity-60">
          {pending ? "جارٍ الإعداد…" : "إعداد الخطابات"}
        </button>
      </form>
    </Modal>
  );
}

function EditModal({ c, l, partyName, hasRef, onClose }: { c: Case; l: QLetter; partyName: string; hasRef: boolean; onClose: () => void }) {
  const [, start] = useTransition();
  const [note, setNote] = useState<string>("");
  const [res, action, pending] = useActionState<QRes, FormData>(async (s, f) => {
    const r = await updateLetter(c.id, l.id, s, f);
    if (r?.ok) onClose();
    return r;
  }, null);
  return (
    <Modal title={`خطاب الأسئلة: ${partyName}`} onClose={onClose} width="max-w-3xl">
      <form action={action} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="تاريخ الخطاب">
            <input type="date" name="letter_date" defaultValue={l.letter_date} className={inputCls} />
          </Field>
          <Field label="مهلة الرد (أيام)">
            <input type="number" name="days" min={1} defaultValue={l.days} className={inputCls} />
          </Field>
          <Field label="آخر موعد للرد (للتمديد غيّره هنا)">
            <input type="date" name="due" defaultValue={l.due ?? ""} className={inputCls} />
          </Field>
        </div>
        <Field label="الأسئلة (سؤال في كل سطر)">
          <textarea name="questions" rows={10} defaultValue={l.questions.join("\n")} className={inputCls + " leading-7"} />
        </Field>
        <Msg res={res} />
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={pending} className="rounded-lg bg-ink hover:bg-ink-hover px-6 py-2 font-semibold text-white disabled:opacity-60">
            حفظ
          </button>
          {!hasRef && (
            <button type="button" onClick={() => start(async () => { const r = await issueLetterRef(c.id, l.id, partyName); setNote(r?.text ?? ""); })} className="rounded-lg border border-line px-3 py-2 text-sm">
              إصدار رقم مرجعي
            </button>
          )}
          {note && <span className="text-sm text-green-700">{note}</span>}
          <span className="flex-1" />
          <Confirm2 label="حذف الخطاب" confirmLabel="تأكيد الحذف" onConfirm={() => start(async () => { await deleteLetter(c.id, l.id); onClose(); })} />
        </div>
      </form>
    </Modal>
  );
}

function MailModal({ c, l, refText, office, onClose }: { c: Case; l: QLetter; refText: string; office: OfficeInfo; onClose: () => void }) {
  const p = c.parties.find((x) => x.id === l.party_id);
  const [toLawyer, setToLawyer] = useState(l.send_to === "lawyer" || (!p?.email && !!p?.lawyer_email));
  const rc = [
    p?.lawyer_email ? { email: p.lawyer_email, label: `المحامي: ${p.lawyer ?? ""}`, on: toLawyer || !p.email } : null,
    p?.email ? { email: p.email, label: `${normRole(p.role)}: ${p.name}`, on: !toLawyer || !p.lawyer_email } : null,
  ].filter(Boolean) as { email: string; label: string; on: boolean }[];
  const [sel, setSel] = useState(rc.filter((r) => r.on).map((r) => r.email));
  const [extra, setExtra] = useState("");
  const [cc, setCc] = useState("");
  const build = () => {
    const v = qLetterVars(c, { ...l, send_to: toLawyer ? "lawyer" : "party" }, refText, office);
    return qMailBody(c, l, refText, office, v.addr);
  };
  const [subject, setSubject] = useState(`أسئلة واستفسارات الخبير في الدعوى رقم ${caseRef(c)}`);
  const [body, setBody] = useState(build);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [, start] = useTransition();
  async function download() {
    const to = [...new Set([...sel, ...extra.split(/[,;،\s]+/).map((x) => x.trim()).filter(Boolean)])];
    if (!to.length) return setErr("اختر مرسلاً إليه واحداً على الأقل.");
    setBusy(true);
    try {
      const { blob } = await buildQDoc(c, { ...l, send_to: toLawyer ? "lawyer" : "party" }, refText, office);
      const name = safeName(`أسئلة الخبير ${normRole(p?.role)} ${c.case_no ?? ""} ${l.letter_date}`) + ".docx";
      const eml = buildEml(to, cc, subject, body, [{ name, type: DOCX_MIME, b64: bufToB64(await blob.arrayBuffer()) }]);
      saveBlob(safeName(`إيميل ${subject}`).slice(0, 80) + ".eml", new Blob([eml], { type: "message/rfc822" }));
      start(async () => {
        await setLetterSendTo(c.id, l.id, toLawyer ? "lawyer" : "party");
        if (!l.sent_at) await markSent(c.id, l.id, true);
      });
      onClose();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <Modal title={`إيميل أسئلة الخبير · ${p?.name ?? ""}`} onClose={onClose} width="max-w-3xl">
      <p className="mb-3 text-sm text-muted">يُنزَّل ملف مسودة (.eml) يفتح في Outlook وفيه خطاب الأسئلة (Word) مرفقاً. بعد التنزيل يُعلَّم الخطاب «تم الإرسال».</p>
      {p?.lawyer && (
        <label className="mb-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={toLawyer} onChange={(e) => { setToLawyer(e.target.checked); const v = qLetterVars(c, { ...l, send_to: e.target.checked ? "lawyer" : "party" }, refText, office); setBody(qMailBody(c, l, refText, office, v.addr)); }} /> مخاطبة المحامي ({p.lawyer}) بصفته وكيل الطرف
        </label>
      )}
      <div className="space-y-1 rounded-lg border border-line p-3 text-sm">
        {rc.map((r) => (
          <label key={r.email} className="flex items-center gap-2">
            <input type="checkbox" checked={sel.includes(r.email)} onChange={(e) => setSel(e.target.checked ? [...sel, r.email] : sel.filter((x) => x !== r.email))} />
            {r.label} <span dir="ltr" className="text-muted">{r.email}</span>
          </label>
        ))}
        {!rc.length && <p className="text-amber-700">لا يوجد بريد مسجّل لهذا الطرف ولا لمحاميه. أضفه من بيانات الدعوى أو اكتبه أدناه.</p>}
        <input dir="ltr" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="بريد إضافي" className={inputCls} />
        <input dir="ltr" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="نسخة (CC)" className={inputCls} />
      </div>
      <label className="mt-3 block text-sm">
        <span className="text-muted">الموضوع</span>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
      </label>
      <label className="mt-3 block text-sm">
        <span className="text-muted">النص</span>
        <textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} className={inputCls + " leading-7"} />
      </label>
      {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button disabled={busy} onClick={download} className="rounded-lg bg-ink hover:bg-ink-hover px-5 py-2 font-semibold text-white disabled:opacity-60">
          تنزيل مسودة Outlook مع المرفق
        </button>
        <button onClick={() => navigator.clipboard.writeText(subject + "\n\n" + body)} className="rounded-lg border border-line px-4 py-2">
          نسخ النص
        </button>
      </div>
    </Modal>
  );
}
