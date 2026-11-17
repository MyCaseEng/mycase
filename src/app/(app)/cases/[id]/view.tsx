"use client";
import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import type { Case, Ev, Member, Note, Party, QLetter } from "@/lib/cases";
import type { Ref } from "@/lib/refs";
import QuestionsPanel from "./questions";
import ArchivePanel from "./archive";
import EventMail from "./event-mail";
import DocsPanel from "./docs";
import { UpdateFromPdf, SourceFileLink } from "./update-pdf";
import { OFFICE_PLACE, type OfficeInfo, type ProcRow } from "@/lib/docs";
import type { Alert } from "@/lib/alerts";
import { AlertLine } from "@/components/alerts-ui";
import { fmtD, inDays, dayDiff, days, money, normCaseNo, normRole, srcOf, srcLabel, todayStr, ROLES1, ROLES2, ROLES3 } from "@/lib/format";
import { Field, Modal, Msg, inputCls } from "@/components/ui";
import Confirm2 from "@/components/confirm2";
import CaseFields from "../case-fields";
import {
  updateCase, saveParty, deleteParty, saveEvent, deleteEvent, setTeam, addNote, deleteNote, setDelivered, trashCase, type Res,
} from "../actions";

export type CaseSettings = { refPrefix: string; qTemplates: Record<string, string[]>; defaultReplyDays: number };
type P = { officeId: string; c: Case; members: Member[]; notes: Note[]; letters: QLetter[]; alerts: Alert[]; office: OfficeInfo; procRows: ProcRow[]; refs: Ref[]; settings: CaseSettings; canWrite: boolean };

const panel = "rounded-2xl border border-line bg-white p-5";
const btn = "rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-background";

export default function CaseView({ officeId, c, members, notes, letters, alerts, refs, settings, office, procRows, canWrite }: P) {
  const [qSetup, setQSetup] = useState(false);
  const delivered = !!c.report_date;
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link href="/cases" className="text-sm text-muted hover:text-brand">
        → الدعاوى
      </Link>
      {alerts.length > 0 && (
        <section className="space-y-1.5">
          {alerts.map((a) => (
            <AlertLine key={a.key} a={a} href={`/cases/${c.id}`} canWrite={canWrite} />
          ))}
        </section>
      )}
      <DataPanel c={c} canWrite={canWrite} />
      <DocsPanel c={c} letters={letters} refs={refs} prefix={settings.refPrefix} office={office} procRows={procRows} canWrite={canWrite} replyDays={settings.defaultReplyDays} onQuestions={() => { setQSetup(true); document.getElementById("questions")?.scrollIntoView({ behavior: "smooth" }); }} />
      <QuestionsPanel c={c} letters={letters} refs={refs} settings={settings} office={office} canWrite={canWrite} openSetup={qSetup} onSetupClose={() => setQSetup(false)} />
      <EventsPanel c={c} canWrite={canWrite} office={office} />
      <ArchivePanel c={c} refs={refs} members={members} prefix={settings.refPrefix} canWrite={canWrite} />
      <TeamPanel c={c} members={members} canWrite={canWrite} />
      {canWrite && (
        <section className={panel}>
          <h2 className="mb-3 font-semibold">إجراءات الدعوى</h2>
          <div className="flex flex-wrap gap-2">
            <DeliverButton c={c} delivered={delivered} />
            <UpdateFromPdf c={c} officeId={officeId} />
            {c.source_file && <SourceFileLink caseId={c.id} />}
            <form action={trashCase.bind(null, c.id)} id="trash" />
            <Confirm2
              label="حذف الدعوى"
              confirmLabel="تأكيد الحذف"
              onConfirm={() => (document.getElementById("trash") as HTMLFormElement).requestSubmit()}
            />
          </div>
        </section>
      )}
      <NotesPanel c={c} notes={notes} members={members} canWrite={canWrite} />
    </div>
  );
}

/* ---------------- بيانات الدعوى والأطراف ---------------- */
function DataPanel({ c, canWrite }: { c: Case; canWrite: boolean }) {
  const [edit, setEdit] = useState(false);
  const [party, setParty] = useState<Party | "new" | null>(null);
  const [hear, setHear] = useState(false);
  const side = (s: 1 | 2 | 3) => c.parties.filter((p) => p.side === s).sort((a, b) => a.sort - b.sort);
  const src = srcOf(c);
  const hearings = c.events.filter((e) => e.type === "جلسة").sort((a, b) => a.date.localeCompare(b.date));
  const next = hearings.find((h) => h.date >= todayStr());
  const last = hearings.at(-1);
  const rows = (r: [string, React.ReactNode][]) =>
    r.filter(([, v]) => v !== null && v !== "" && v !== "—").map(([k, v]) => (
      <div key={k} className="grid grid-cols-[9rem_1fr] gap-2 border-b border-line py-2 text-sm last:border-0">
        <span className="text-muted">{k}</span>
        <span className="font-semibold">{v}</span>
      </div>
    ));

  return (
    <section id="data" className={`${panel} scroll-mt-4`}>
      <div className="text-center">
        <h1 className="text-2xl font-bold">بيانات الدعوى والأطراف</h1>
        <div className="mt-1 text-lg">
          {c.case_no ? (
            <>
              <span dir="ltr" className="inline-block">{normCaseNo(c.case_no)}</span> {c.case_type}
            </>
          ) : (
            <span className="rounded-full bg-amber-100 px-3 py-0.5 text-sm font-semibold text-amber-800">بدون رقم بعد</span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs">
          {src && <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-blue-800">{srcLabel(src)}</span>}
          {c.supplementary && <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-purple-800">تقرير تكميلي</span>}
          {c.report_date && <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-green-800">تم التسليم في {fmtD(c.report_date)}</span>}
        </div>
      </div>

      <div className="mt-5 grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
        <SideCard title="الطرف الأول" ps={side(1)} onEdit={setParty} canWrite={canWrite} />
        <div className="self-center text-center font-bold text-muted">ضد</div>
        <SideCard title="الطرف الثاني" ps={side(2)} onEdit={setParty} canWrite={canWrite} />
      </div>
      {side(3).length > 0 && (
        <div className="mt-3">
          <SideCard title="أطراف أخرى" ps={side(3)} onEdit={setParty} canWrite={canWrite} />
        </div>
      )}
      {canWrite && (
        <button onClick={() => setParty("new")} className={`${btn} mt-3`}>
          + إضافة طرف
        </button>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div>
          <h3 className="mb-1 text-sm font-semibold text-brand">المحكمة والدعوى</h3>
          {rows([
            ["الجهة", c.authority],
            ["النوع", c.category],
            ["الدائرة", c.circuit],
            ["القاضي", c.judge],
            ["أمين السر", c.secretary],
            ["رقم المأمورية", c.mission],
          ])}
        </div>
        <div>
          <h3 className="mb-1 text-sm font-semibold text-brand">التواريخ والمهل</h3>
          {rows([
            ["تاريخ الورود", c.received && fmtD(c.received)],
            ["الحكم التمهيدي", c.prelim_date && fmtD(c.prelim_date)],
            ["الموعد النهائي", c.deadline && `${fmtD(c.deadline)} (${inDays(c.deadline)})`],
          ])}
        </div>
        <div>
          <h3 className="mb-1 text-sm font-semibold text-brand">الأمانة والمبالغ</h3>
          {rows([
            ["الأمانة المقررة", c.deposit_ordered != null ? money(c.deposit_ordered) : null],
            ["قيمة المطالبة", c.claim_value != null ? money(c.claim_value) : null],
            ["قيمة المشروع", c.project_value != null ? money(c.project_value) : null],
          ])}
        </div>
      </div>
      {c.due_note && <div className="mt-4 rounded-xl bg-background p-3 text-sm leading-7">{c.due_note}</div>}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <span className="text-sm text-muted">الجلسة القادمة:</span>
        {next ? (
          <span className={`font-semibold ${dayDiff(next.date) <= 7 ? "text-red-700" : ""}`}>
            {fmtD(next.date)} ({inDays(next.date)}){next.note ? ` · ${next.note}` : ""}
          </span>
        ) : last ? (
          <span>
            <span className="text-muted line-through">{fmtD(last.date)}</span>{" "}
            <span className="text-sm text-amber-700">مضى عليها {days(dayDiff(last.date))} — سجّل الجلسة التالية</span>
          </span>
        ) : (
          <span className="text-muted">لا توجد جلسة مسجّلة</span>
        )}
        {canWrite && (
          <button onClick={() => setHear(true)} className={btn}>
            ✎ الجلسات
          </button>
        )}
        <span className="flex-1" />
        {canWrite && (
          <button onClick={() => setEdit(true)} className="rounded-lg bg-ink hover:bg-ink-hover px-4 py-1.5 text-sm font-semibold text-white">
            ✎ تعديل البيانات
          </button>
        )}
      </div>

      {edit && <EditCaseModal c={c} onClose={() => setEdit(false)} />}
      {party && <PartyModal caseId={c.id} p={party === "new" ? null : party} onClose={() => setParty(null)} />}
      {hear && <HearingsModal c={c} hearings={hearings} onClose={() => setHear(false)} />}
    </section>
  );
}

function SideCard({ title, ps, onEdit, canWrite }: { title: string; ps: Party[]; onEdit: (p: Party) => void; canWrite: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-background/50 p-4">
      <div className="mb-2 text-xs font-semibold text-muted">{title}</div>
      {!ps.length && <div className="text-sm text-muted">—</div>}
      <div className="space-y-3">
        {ps.map((p) => (
          <div key={p.id} className="text-sm leading-6">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <span className="text-muted">{normRole(p.role)}: </span>
                <b>{p.name}</b>
              </div>
              {canWrite && (
                <button onClick={() => onEdit(p)} aria-label="تعديل الطرف" className="text-muted hover:text-brand">
                  ✎
                </button>
              )}
            </div>
            {(p.phone || p.email) && (
              <div className="text-xs text-muted" dir="ltr">
                {[p.phone, p.email].filter(Boolean).join(" · ")}
              </div>
            )}
            {p.lawyer && (
              <div className="text-xs">
                <span className="text-muted">المحامي: </span>
                {p.lawyer}
                {(p.lawyer_phone || p.lawyer_email) && (
                  <span className="block text-muted" dir="ltr">
                    {[p.lawyer_phone, p.lawyer_email].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>
            )}
            {!p.email && !p.lawyer_email && <div className="text-xs text-amber-700">لا يوجد بريد للطرف ولا لمحاميه</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function EditCaseModal({ c, onClose }: { c: Case; onClose: () => void }) {
  const [res, action, pending] = useActionState<Res, FormData>(async (s, f) => {
    const r = await updateCase(c.id, s, f);
    if (r?.ok) onClose();
    return r;
  }, null);
  return (
    <Modal title="تعديل بيانات الدعوى" onClose={onClose} width="max-w-3xl">
      <form action={action} className="space-y-4">
        <CaseFields c={c} />
        <Msg res={res} />
        <button disabled={pending} className="rounded-lg bg-ink hover:bg-ink-hover px-6 py-2 font-semibold text-white disabled:opacity-60">
          حفظ
        </button>
      </form>
    </Modal>
  );
}

function PartyModal({ caseId, p, onClose }: { caseId: string; p: Party | null; onClose: () => void }) {
  const [, start] = useTransition();
  const [res, action, pending] = useActionState<Res, FormData>(async (s, f) => {
    const r = await saveParty(caseId, p?.id ?? null, s, f);
    if (r?.ok) onClose();
    return r;
  }, null);
  return (
    <Modal title={p ? `تعديل: ${p.name}` : "إضافة طرف"} onClose={onClose}>
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <Field label="الصفة">
          <input name="role" list="allroles" required defaultValue={p?.role ?? ""} className={inputCls} />
          <datalist id="allroles">{[...ROLES1, ...ROLES2, ...ROLES3].map((r) => <option key={r} value={r} />)}</datalist>
        </Field>
        <Field label="النوع">
          <select name="kind" defaultValue={p?.kind ?? "شركة"} className={inputCls}>
            <option>شركة</option>
            <option>رجل</option>
            <option>امرأة</option>
            <option>جهة حكومية</option>
          </select>
        </Field>
        <Field label="الاسم الكامل" wide>
          <input name="name" required defaultValue={p?.name ?? ""} className={inputCls} />
        </Field>
        <Field label="هاتف الطرف">
          <input name="phone" dir="ltr" defaultValue={p?.phone ?? ""} className={inputCls + " text-right"} />
        </Field>
        <Field label="بريد الطرف">
          <input name="email" type="email" dir="ltr" defaultValue={p?.email ?? ""} className={inputCls + " text-right"} />
        </Field>
        <Field label="المحامي أو مكتب المحاماة" wide>
          <input name="lawyer" defaultValue={p?.lawyer ?? ""} className={inputCls} />
        </Field>
        <Field label="هاتف المحامي">
          <input name="lawyer_phone" dir="ltr" defaultValue={p?.lawyer_phone ?? ""} className={inputCls + " text-right"} />
        </Field>
        <Field label="بريد المحامي">
          <input name="lawyer_email" type="email" dir="ltr" defaultValue={p?.lawyer_email ?? ""} className={inputCls + " text-right"} />
        </Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button disabled={pending} className="rounded-lg bg-ink hover:bg-ink-hover px-6 py-2 font-semibold text-white disabled:opacity-60">
            حفظ
          </button>
          <Msg res={res} />
          <span className="flex-1" />
          {p && <Confirm2 label="حذف الطرف" confirmLabel="تأكيد الحذف" onConfirm={() => start(async () => { await deleteParty(caseId, p.id); onClose(); })} />}
        </div>
      </form>
    </Modal>
  );
}

function HearingsModal({ c, hearings, onClose }: { c: Case; hearings: Ev[]; onClose: () => void }) {
  const [, start] = useTransition();
  const [res, action, pending] = useActionState<Res, FormData>((s, f) => saveEvent(c.id, null, s, f), null);
  return (
    <Modal title="جلسات الدعوى" onClose={onClose}>
      <p className="mb-3 text-sm text-muted">الخبير لا يحضر الجلسة؛ تاريخها للتنبيه بقرب موعد تسليم التقرير أو تجهيز كتاب تأجيل.</p>
      <ul className="mb-4 divide-y divide-line rounded-lg border border-line">
        {hearings.map((h) => (
          <li key={h.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <b className={h.date < todayStr() ? "text-muted line-through" : ""}>{fmtD(h.date)}</b>
            <span className="flex-1 text-muted">{h.note}</span>
            <Confirm2 label="حذف" confirmLabel="تأكيد" onConfirm={() => start(() => deleteEvent(c.id, h.id))} />
          </li>
        ))}
        {!hearings.length && <li className="px-3 py-2 text-sm text-muted">لا توجد جلسات.</li>}
      </ul>
      <form action={action} className="grid gap-3 sm:grid-cols-[10rem_1fr_auto]">
        <input type="hidden" name="type" value="جلسة" />
        <input type="date" name="date" required className={inputCls} />
        <input name="note" placeholder="الغرض (مثل: لسداد الأمانة، لتقديم التقرير)" className={inputCls} />
        <button disabled={pending} className="mt-1 rounded-lg bg-ink hover:bg-ink-hover px-4 py-2 font-semibold text-white">
          إضافة جلسة
        </button>
        <div className="sm:col-span-3">
          <Msg res={res} />
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- المواعيد (اجتماعات ومعاينات) ---------------- */
function EventsPanel({ c, canWrite, office }: { c: Case; canWrite: boolean; office: OfficeInfo }) {
  const [open, setOpen] = useState<Ev | "new" | null>(null);
  const [mail, setMail] = useState<Ev | null>(null);
  const evs = c.events.filter((e) => e.type !== "جلسة").sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")));
  const who = (v: string) => (v === "1" ? "الطرف الأول" : v === "2" ? "الطرف الثاني" : "كل الأطراف");
  return (
    <section id="events" className={`${panel} scroll-mt-4`}>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="flex-1 font-semibold">المواعيد</h2>
        {canWrite && (
          <button onClick={() => setOpen("new")} className={btn}>
            + موعد
          </button>
        )}
      </div>
      {!evs.length ? (
        <p className="text-sm text-muted">لم يُحدَّد اجتماع ولا معاينة بعد.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-right text-muted">
              <tr>
                <th className="py-1 font-medium">النوع</th>
                <th className="py-1 font-medium">التاريخ</th>
                <th className="py-1 font-medium">الوقت</th>
                <th className="py-1 font-medium">المكان</th>
                <th className="py-1 font-medium">المدعوون</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {evs.map((e) => (
                <tr key={e.id} className={`border-t border-line ${e.date < todayStr() ? "text-muted" : ""}`}>
                  <td className="py-2 font-semibold">{e.type}</td>
                  <td className="py-2">
                    {fmtD(e.date)} <span className="text-xs text-muted">({inDays(e.date)})</span>
                  </td>
                  <td className="py-2" dir="ltr">{e.time?.slice(0, 5) ?? "—"}</td>
                  <td className="py-2">{e.place ?? "—"}</td>
                  <td className="py-2">{who(e.invited)}</td>
                  <td className="whitespace-nowrap py-2 text-left">
                    <button onClick={() => setMail(e)} title="إيميل الموعد للأطراف" className="me-3 rounded-md border border-line px-2 py-0.5 text-xs hover:border-brand">
                      ✉ إيميل
                    </button>
                    {canWrite && (
                      <button onClick={() => setOpen(e)} title="تعديل الموعد" className="text-muted hover:text-brand">
                        ✎
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && <EventModal caseId={c.id} e={open === "new" ? null : open} onClose={() => setOpen(null)} />}
      {mail && <EventMail c={c} e={mail} office={office} onClose={() => setMail(null)} />}
    </section>
  );
}

function EventModal({ caseId, e, onClose }: { caseId: string; e: Ev | null; onClose: () => void }) {
  const [, start] = useTransition();
  const [res, action, pending] = useActionState<Res, FormData>(async (s, f) => {
    const r = await saveEvent(caseId, e?.id ?? null, s, f);
    if (r?.ok) onClose();
    return r;
  }, null);
  return (
    <Modal title={e ? "تعديل الموعد" : "موعد جديد"} onClose={onClose} width="max-w-xl">
      <form action={action} className="grid gap-3 sm:grid-cols-2">
        <Field label="النوع">
          <select name="type" defaultValue={e?.type ?? "اجتماع"} className={inputCls}>
            <option>اجتماع</option>
            <option>معاينة</option>
          </select>
        </Field>
        <Field label="المدعوون">
          <select name="invited" defaultValue={e?.invited ?? "all"} className={inputCls}>
            <option value="all">كل الأطراف</option>
            <option value="1">الطرف الأول</option>
            <option value="2">الطرف الثاني</option>
          </select>
        </Field>
        <Field label="التاريخ">
          <input type="date" name="date" required defaultValue={e?.date ?? ""} className={inputCls} />
        </Field>
        <Field label="الوقت">
          <input type="time" name="time" defaultValue={e?.time?.slice(0, 5) ?? ""} className={inputCls} />
        </Field>
        <Field label="المكان (اكتبه، أو اختر «مقر مكتب الخبير»، أو الصق رابط الخريطة أو رابط Zoom)" wide>
          <input name="place" list="ev-places" defaultValue={e?.place ?? ""} className={inputCls} />
          <datalist id="ev-places">
            <option value={OFFICE_PLACE} />
          </datalist>
        </Field>
        <Field label="ملاحظة" wide>
          <input name="note" defaultValue={e?.note ?? ""} className={inputCls} />
        </Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button disabled={pending} className="rounded-lg bg-ink hover:bg-ink-hover px-6 py-2 font-semibold text-white disabled:opacity-60">
            حفظ
          </button>
          <Msg res={res} />
          <span className="flex-1" />
          {e && <Confirm2 label="حذف الموعد" confirmLabel="تأكيد الحذف" onConfirm={() => start(async () => { await deleteEvent(caseId, e.id); onClose(); })} />}
        </div>
      </form>
    </Modal>
  );
}

/* ---------------- الفريق ---------------- */
function TeamPanel({ c, members, canWrite }: { c: Case; members: Member[]; canWrite: boolean }) {
  const [edit, setEdit] = useState(false);
  const active = members.filter((m) => m.is_active);
  const nm = (id: string) => members.find((m) => m.user_id === id)?.display_name ?? "—";
  const ex = c.case_team.filter((t) => t.duty === "executor").map((t) => t.user_id);
  const co = c.case_team.filter((t) => t.duty === "coordinator").map((t) => t.user_id);
  const [selEx, setEx] = useState(ex);
  const [selCo, setCo] = useState(co);
  const [res, setRes] = useState<Res>(null);
  const [pending, start] = useTransition();
  const toggle = (arr: string[], set: (v: string[]) => void, id: string) => set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  return (
    <section className={panel}>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="flex-1 font-semibold">الفريق</h2>
        {canWrite && !edit && (
          <button onClick={() => setEdit(true)} className={btn}>
            ✎ تعديل
          </button>
        )}
      </div>
      {!edit ? (
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted">المنفّذ: </span>
            <b>{ex.map(nm).join("، ") || "—"}</b>
          </div>
          <div>
            <span className="text-muted">المنسّق: </span>
            <b>{co.map(nm).join("، ") || "—"}</b>
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          {[["المنفّذ", selEx, setEx], ["المنسّق", selCo, setCo]].map(([label, arr, set]) => (
            <div key={label as string} className="flex flex-wrap items-center gap-2">
              <span className="w-16 text-muted">{label as string}</span>
              {active.map((m) => {
                const on = (arr as string[]).includes(m.user_id);
                return (
                  <button
                    key={m.user_id}
                    type="button"
                    onClick={() => toggle(arr as string[], set as (v: string[]) => void, m.user_id)}
                    className={`rounded-full px-3 py-1 ${on ? "bg-ink hover:bg-ink-hover text-white" : "border border-line"}`}
                  >
                    {m.display_name}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="flex items-center gap-2">
            <button
              disabled={pending}
              onClick={() => start(async () => { const r = await setTeam(c.id, selEx, selCo); setRes(r); if (r?.ok) setEdit(false); })}
              className="rounded-lg bg-ink hover:bg-ink-hover px-4 py-1.5 font-semibold text-white"
            >
              حفظ
            </button>
            <button onClick={() => { setEx(ex); setCo(co); setEdit(false); }} className={btn}>
              إلغاء
            </button>
            <Msg res={res} />
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------------- إجراءات ---------------- */
function DeliverButton({ c, delivered }: { c: Case; delivered: boolean }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [pending, start] = useTransition();
  if (delivered)
    return <Confirm2 label="إلغاء تسليم التقرير" confirmLabel="تأكيد الإلغاء" onConfirm={() => start(async () => { await setDelivered(c.id, null); })} />;
  return open ? (
    <span className="flex items-center gap-2">
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-line px-2 py-1 text-sm" />
      <button disabled={pending} onClick={() => start(async () => { await setDelivered(c.id, date); setOpen(false); })} className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-semibold text-white">
        تأكيد التسليم
      </button>
    </span>
  ) : (
    <button onClick={() => setOpen(true)} className={btn}>
      ✓ تسليم التقرير للمحكمة
    </button>
  );
}

/* ---------------- سجل الملاحظات ---------------- */
function NotesPanel({ c, notes, members, canWrite }: { c: Case; notes: Note[]; members: Member[]; canWrite: boolean }) {
  const [, start] = useTransition();
  const [res, action, pending] = useActionState<Res, FormData>((s, f) => addNote(c.id, s, f), null);
  const nm = (id: string | null) => members.find((m) => m.user_id === id)?.display_name ?? "";
  return (
    <section className={panel}>
      <h2 className="mb-3 font-semibold">سجل الملاحظات</h2>
      {canWrite && (
        <form action={action} key={notes.length} className="mb-4 flex gap-2">
          <input name="body" placeholder="اكتب ملاحظة…" className="flex-1 rounded-lg border border-line px-3 py-2" />
          <button disabled={pending} className="rounded-lg bg-ink hover:bg-ink-hover px-4 font-semibold text-white">
            إضافة
          </button>
        </form>
      )}
      <Msg res={res && !res.ok ? res : null} />
      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="rounded-lg bg-background p-3 text-sm">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>{nm(n.author)}</span>
              <span>{fmtD(n.created_at)}</span>
              <span className="flex-1" />
              {canWrite && <Confirm2 label="حذف" confirmLabel="تأكيد" onConfirm={() => start(() => deleteNote(c.id, n.id))} />}
            </div>
            <div className="mt-1 whitespace-pre-wrap leading-6">{n.body}</div>
          </li>
        ))}
        {!notes.length && <li className="text-sm text-muted">لا توجد ملاحظات.</li>}
      </ul>
    </section>
  );
}
