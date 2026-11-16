"use client";
import { useActionState, useState, useTransition } from "react";
import type { Case, QLetter } from "@/lib/cases";
import type { Ref } from "@/lib/refs";
import { fmtRef } from "@/lib/refs";
import { fmtD, dayDiff, todayStr, normRole } from "@/lib/format";
import { Field, Modal, Msg, inputCls } from "@/components/ui";
import Confirm2 from "@/components/confirm2";
import { createLetters, updateLetter, markSent, setReply, deleteLetter, issueLetterRef, type QRes } from "../q-actions";
import type { CaseSettings } from "./view";

const panel = "rounded-2xl border border-line bg-white p-5";

// Expert questions to the parties: one letter per party, a reply period, and three status buttons.
export default function QuestionsPanel({ c, letters, refs, settings, canWrite }: { c: Case; letters: QLetter[]; refs: Ref[]; settings: CaseSettings; canWrite: boolean }) {
  const [setup, setSetup] = useState(false);
  const [edit, setEdit] = useState<QLetter | null>(null);
  const party = (id: string | null) => c.parties.find((p) => p.id === id);
  const refOf = (id: string | null) => refs.find((r) => r.id === id);

  return (
    <section className={panel}>
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
            <LetterRow key={l.id} c={c} l={l} partyName={party(l.party_id)?.name ?? l.addressee ?? "—"} partyRole={normRole(party(l.party_id)?.role)} refText={refOf(l.ref_id) ? fmtRef(settings.refPrefix, refOf(l.ref_id)!) : ""} canWrite={canWrite} onEdit={() => setEdit(l)} />
          ))}
        </div>
      )}
      {setup && <SetupModal c={c} settings={settings} onClose={() => setSetup(false)} />}
      {edit && <EditModal c={c} l={edit} partyName={party(edit.party_id)?.name ?? ""} hasRef={!!edit.ref_id} onClose={() => setEdit(null)} />}
    </section>
  );
}

function LetterRow({ c, l, partyName, partyRole, refText, canWrite, onEdit }: { c: Case; l: QLetter; partyName: string; partyRole: string; refText: string; canWrite: boolean; onEdit: () => void }) {
  const [pending, start] = useTransition();
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
  const b = (on: boolean) => `rounded-lg px-3 py-1.5 text-sm font-semibold ${on ? "bg-brand text-white" : "border border-line hover:bg-background"}`;
  return (
    <div className="@container rounded-xl border border-line p-3">
      <div className="grid items-center gap-3 @3xl:grid-cols-[1.4fr_1fr_1fr_auto]">
        <div>
          <div className="text-xs text-muted">{partyRole}</div>
          <div className="font-semibold">{partyName}</div>
        </div>
        <div className="text-sm">
          <div className="text-xs text-muted">أسئلة واستفسارات</div>
          {fmtD(l.letter_date)} {refText && <span className="text-xs text-muted" dir="ltr">· {refText}</span>}
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
            <button onClick={onEdit} aria-label="تعديل الخطاب" className="px-2 text-muted hover:text-brand">
              ✎
            </button>
          </div>
        )}
      </div>
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
        <p className="text-xs text-muted">ملف Word للخطاب ومسودة البريد مع المرفق يُضافان في الخطوة 6؛ الآن تُسجَّل الخطابات ومهلها.</p>
        <Msg res={res} />
        <button disabled={pending} className="rounded-lg bg-brand px-6 py-2 font-semibold text-white disabled:opacity-60">
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
          <button disabled={pending} className="rounded-lg bg-brand px-6 py-2 font-semibold text-white disabled:opacity-60">
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
