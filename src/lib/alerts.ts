// Alert rules, ported from the prototype. Pure functions: same input → same alerts, on server or client.
import type { Case, QLetter } from "@/lib/cases";
import { dayDiff, days, fmtD, todayStr, money } from "@/lib/format";

export const AL_RULES = { DEP_AMBER: 5, DEP_RED: 14, RECENT: 60, Q_AFTER: 2, Q_RED: 5, SCHED_AFTER: 7, SCHED_RED: 14, HEAR_DAYS: 14, DL_DAYS: 14 };

export type Level = "red" | "amber" | "calm";
export type Act = "questions" | "event" | "hearings" | "party" | "case" | "money";
export type Alert = { key: string; caseId: string; level: Level; text: string; act: Act; actLabel: string };
export type Snooze = { case_id: string; alert_key: string; until: string };

const isDelivered = (c: Case) => !!c.report_date || c.status === "تم التسليم";
const qOpen = (l: QLetter) => !l.reply_date || l.reply_type === "partial";

export function caseAlerts(c: Case, letters: QLetter[], snoozes: Snooze[] = []): Alert[] {
  if (isDelivered(c)) return [];
  const t = todayStr();
  const A: Alert[] = [];
  const add = (key: string, level: Level, text: string, act: Act, actLabel: string) => A.push({ key, caseId: c.id, level, text, act, actLabel });
  const received = c.received ?? c.created_at.slice(0, 10);
  const age = -dayDiff(received);
  const recent = age <= AL_RULES.RECENT;
  const main = c.parties.filter((p) => p.side !== 3);
  const pname = (id: string | null) => c.parties.find((p) => p.id === id)?.name ?? "الطرف";
  const evs = c.events.filter((e) => e.type !== "جلسة");

  // deposit: the expert does not start before the parties pay it to the court, so the work clock starts at the payment
  const deps = (c.pays ?? []).filter((p) => p.kind === "deposit").sort((a, b) => a.paid_on.localeCompare(b.paid_on));
  const waiting = !!c.pays && (c.deposit_ordered ?? 0) > 0 && !deps.length;
  const work = deps.length ? Math.min(age, -dayDiff(deps[0].paid_on)) : age;
  if (c.pays && (c.deposit_ordered ?? 0) > 0) {
    const paid = deps.reduce((s, p) => s + Number(p.amount), 0);
    const due = Number(c.deposit_ordered);
    if (paid <= 0)
      add("deposit", age >= AL_RULES.DEP_RED ? "red" : age >= AL_RULES.DEP_AMBER ? "amber" : "calm",
        `لم يُسجَّل سداد الأمانة (${money(due)}) — مضى على ورود الدعوى ${days(age)}`, "money", "تسجيل السداد");
    else if (paid < due)
      add("deposit-part", "amber", `سُدّد من الأمانة ${money(paid)} من ${money(due)}، والباقي ${money(due - paid)}`, "money", "متابعة الأمانة");
  }

  // questions not prepared yet
  const since = deps.length ? "منذ سداد الأمانة" : "منذ ورود الدعوى";
  if (recent && !waiting && !letters.length && work >= AL_RULES.Q_AFTER)
    add("noq", work >= AL_RULES.Q_RED ? "red" : "amber", `لم تُرسل أسئلة الخبير للأطراف (${since} ${days(work)})`, "questions", "إعداد الأسئلة");

  // reply periods
  letters.forEach((l) => {
    if (!l.sent_at && l.letter_date <= t && -dayDiff(l.letter_date) >= 1)
      add(`qnotsent|${l.id}`, "amber", `خطاب الأسئلة إلى ${pname(l.party_id)} لم يُعلَّم «تم الإرسال»`, "questions", "فتح الأسئلة");
    else if (l.sent_at && qOpen(l) && l.due) {
      const dd = dayDiff(l.due);
      const part = l.reply_type === "partial" ? "رد جزئياً و" : "";
      if (dd < 0) add(`qlate|${l.id}`, "red", `${pname(l.party_id)} ${part}انتهت مهلة رده منذ ${days(dd)}`, "questions", "تسجيل الرد أو التمديد");
      else if (dd <= 1) add(`qdue|${l.id}`, "amber", `تنتهي مهلة رد ${pname(l.party_id)} ${dd === 0 ? "اليوم" : "غداً"}`, "questions", "فتح الأسئلة");
    }
  });

  // nothing scheduled
  if (recent && !waiting && !evs.length) {
    const allReplied = main.length > 0 && main.every((p) => letters.some((l) => l.party_id === p.id && l.reply_type === "full"));
    if (allReplied) add("sched", "red", "وصلت ردود الأطراف ولم يُحدَّد موعد اجتماع أو معاينة", "event", "إضافة موعد");
    else if (work >= AL_RULES.SCHED_AFTER)
      add("sched", work >= AL_RULES.SCHED_RED ? "red" : "amber", `لم يُحدَّد اجتماع ولا معاينة (${since} ${days(work)})`, "event", "إضافة موعد");
  }

  // today / tomorrow
  evs.forEach((e) => {
    const dd = dayDiff(e.date);
    const at = e.time ? ` الساعة ${e.time.slice(0, 5)}` : "";
    if (dd === 0) add(`evtoday|${e.id}`, "red", `${e.type} اليوم${at}`, "case", "فتح الدعوى");
    else if (dd === 1) add(`evtom|${e.id}`, "amber", `${e.type} غداً${at}`, "case", "فتح الدعوى");
  });

  // hearings
  const hearings = c.events.filter((e) => e.type === "جلسة").sort((a, b) => a.date.localeCompare(b.date));
  const next = hearings.find((h) => h.date >= t);
  if (next) {
    const dd = dayDiff(next.date);
    if (dd <= AL_RULES.HEAR_DAYS)
      add(`hear|${next.date}`, dd <= 3 ? "red" : dd <= 7 ? "amber" : "calm",
        `الجلسة ${dd === 0 ? "اليوم" : dd === 1 ? "غداً" : `بعد ${days(dd)}`} (${fmtD(next.date)}): جهّز التقرير أو كتاب طلب التأجيل`, "case", "فتح الدعوى");
  } else if (hearings.length) {
    const last = hearings.at(-1)!;
    add(`hearpast|${last.date}`, "amber", `آخر جلسة مسجّلة (${fmtD(last.date)}) مضى عليها ${days(dayDiff(last.date))} — سجّل الجلسة التالية`, "hearings", "تسجيل الجلسة الجديدة");
  }

  // report deadline
  if (c.deadline) {
    const dd = dayDiff(c.deadline);
    if (dd <= AL_RULES.DL_DAYS)
      add("dl", dd <= 3 ? "red" : "amber", dd < 0 ? `تجاوز الموعد النهائي للتقرير بـ ${days(dd)}` : `الموعد النهائي للتقرير ${dd === 0 ? "اليوم" : `بعد ${days(dd)}`}`, "case", "فتح الدعوى");
  }

  // missing contact emails
  main.forEach((p) => {
    if (!p.email && !p.lawyer_email) add(`noemail|${p.id}`, "calm", `لا يوجد بريد لـ${p.name} ولا لمحاميه`, "party", "إضافة بريد");
  });

  const sn = snoozes.filter((s) => s.case_id === c.id && s.until >= t);
  return A.filter((a) => !sn.some((s) => s.alert_key === a.key));
}

export const LEVEL_ORDER: Record<Level, number> = { red: 0, amber: 1, calm: 2 };

// ---- board stages (home page kanban) ----
export const STAGES = [
  ["old", "قيد العمل", "مسجّلة قبل المنصة"],
  ["new", "وردت حديثاً", "لم تُرسل الأسئلة"],
  ["wait", "بانتظار ردود الأطراف", "الأسئلة أُرسلت"],
  ["sched", "تحديد المواعيد", "الردود وصلت"],
  ["visits", "اجتماعات ومعاينات", "مواعيد قادمة"],
  ["report", "إعداد التقرير", "المواعيد تمّت"],
] as const;
export type Stage = (typeof STAGES)[number][0];
export function caseStage(c: Case, letters: QLetter[]): Stage {
  const t = todayStr();
  const evs = c.events.filter((e) => e.type !== "جلسة");
  if (evs.length) return evs.some((e) => e.date >= t) ? "visits" : "report";
  if (!letters.length) {
    const r = c.received ?? c.created_at.slice(0, 10);
    return -dayDiff(r) > AL_RULES.RECENT ? "old" : "new";
  }
  return letters.some(qOpen) ? "wait" : "sched";
}
