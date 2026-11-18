// The life cycle of a case as a line of steps, worked out from data the office already keeps.
// Pure: same input → same result, on server or client.
import type { Case, QLetter } from "@/lib/cases";
import { caseAlerts, LEVEL_ORDER, type Alert, type Level, type Snooze } from "@/lib/alerts";
import { dayDiff, days, fmtD, inDays, todayStr } from "@/lib/format";

export const STEPS = [
  "استلام الحكم",
  "سداد الأمانة",
  "إخطار البدء",
  "الأسئلة والاستفسارات",
  "المعاينة والاجتماعات",
  "إعداد التقرير",
  "التوقيع والتسليم",
] as const;

export type Tone = Level | "none";
export type Life = {
  cur: number; // index of the current step; STEPS.length when delivered
  tone: Tone; // how the current step is going
  note: string; // one short line on where the case stands
  replies: { sent: number; done: number; late: number; tone: Tone } | null; // the parallel replies track
};

// what the board needs about a case beyond the case itself
export type LifeExtra = { refCats: string[]; reportFile: boolean };

const worst = (list: Alert[]): Alert | undefined => [...list].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level])[0];
const toneOf = (a?: Alert): Tone => (a && a.level !== "calm" ? a.level : "none");
const isReplyKey = (k: string) => k.startsWith("qlate|") || k.startsWith("qdue|");

export function caseLife(c: Case, letters: QLetter[], extra: LifeExtra, snoozes: Snooze[] = []): Life {
  const t = todayStr();
  const delivered = !!c.report_date || c.status === "تم التسليم";
  const evs = c.events.filter((e) => e.type !== "جلسة");
  const sent = letters.filter((l) => l.sent_at);
  const has = (cat: string) => extra.refCats.includes(cat);

  // evidence that a step happened; a later step proves the earlier ones too
  const ev = [
    true,
    (c.pays ?? []).some((p) => p.kind === "deposit"),
    has("إخطار بدء المأمورية"),
    sent.length > 0 || has("أسئلة واستفسارات"),
    evs.length > 0 && evs.every((e) => e.date < t),
    has("تقرير خبرة") || extra.reportFile,
    delivered,
  ];
  let last = 0;
  ev.forEach((x, i) => x && (last = i));
  // the meetings step is not done while an appointment is still ahead, even if a report number exists
  const cur = delivered ? STEPS.length : Math.min(last + 1, evs.some((e) => e.date >= t) ? 4 : STEPS.length - 1);

  const alerts = delivered ? [] : caseAlerts(c, letters, snoozes);
  // deposit alerts belong to the deposit step; once the work moved on they would only hide the real status
  const main = worst(alerts.filter((a) => !isReplyKey(a.key) && a.level !== "calm" && (cur === 1 || !a.key.startsWith("deposit"))));
  const repl = worst(alerts.filter((a) => isReplyKey(a.key)));

  let note = "";
  if (delivered) note = c.report_date ? `سُلِّم التقرير ${fmtD(c.report_date)}` : "سُلِّم التقرير";
  else if (main) note = main.text;
  else if (cur === 1) note = "تحقّق من سداد الأمانة";
  else if (cur === 2) note = "أصدِر إخطار بدء المأمورية";
  else if (cur === 3) note = letters.length ? "خطابات الأسئلة لم تُرسل بعد" : "جهّز أسئلة الخبير وأرسلها";
  else if (cur === 4) {
    const next = evs.filter((e) => e.date >= t).sort((a, b) => a.date.localeCompare(b.date))[0];
    note = next ? `${next.type} ${fmtD(next.date)} (${inDays(next.date)})` : "حدّد موعد المعاينة أو الاجتماع";
  } else if (cur === 5) note = c.deadline ? (dayDiff(c.deadline) < 0 ? `تجاوز موعد الإيداع بـ ${days(dayDiff(c.deadline))}` : `الإيداع ${inDays(c.deadline)}`) : "التقرير قيد الإعداد";
  else if (cur === 6) note = "التقرير جاهز للتوقيع والتسليم";

  const replies = sent.length
    ? {
        sent: sent.length,
        done: sent.filter((l) => l.reply_type === "full").length,
        late: sent.filter((l) => l.reply_type !== "full" && l.due && l.due < t).length,
        tone: toneOf(repl),
      }
    : null;

  return { cur, tone: delivered ? "none" : toneOf(main), note, replies };
}
