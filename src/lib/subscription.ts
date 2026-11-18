// Where an office's subscription stands. Pure, shared by the owner page and (later) the office.
export type Sub = {
  office_id: string;
  plan: string;
  price: number | null;
  cycle_months: number;
  trial_ends: string;
  trial_started?: string | null;
  paid_until: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  note: string | null;
  paid_total: number;
  last_paid: string | null;
};
// Stages after the end (same rules as sub_stage() in the database; the last day of a period is a full day):
//   free trial : 3 days read + export, then view only
//   paid       : 3 days full, then 4 days read + export, then view only
export const PAID_FULL_DAYS = 3;
export const PAID_EXPORT_UNTIL = 7;
export const TRIAL_EXPORT_UNTIL = 3;
export const KEEP_DAYS = 90; // data kept this long after "view only" starts

const diff = (a: string, b: string) => Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 86400000);
const addD = (d: string, n: number) => new Date(Date.parse(d + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);

type SubDates = Pick<Sub, "trial_ends" | "paid_until" | "cancelled_at">;
// the last day of full use of the current period
export function subEnd(s: SubDates): string {
  if (s.cancelled_at) return s.cancelled_at;
  return s.paid_until && s.paid_until > s.trial_ends ? s.paid_until : s.trial_ends;
}
export const isTrial = (s: SubDates) => !s.cancelled_at && (!s.paid_until || s.paid_until < s.trial_ends);

export type Stage = "full" | "export" | "view";
// key dates after the end: last day of full use, last day of export, first day of view only, deletion
export function subDates(s: SubDates) {
  const end = subEnd(s);
  const trial = isTrial(s);
  const fullUntil = trial ? end : addD(end, PAID_FULL_DAYS);
  const exportUntil = addD(end, trial ? TRIAL_EXPORT_UNTIL : PAID_EXPORT_UNTIL);
  const viewFrom = addD(exportUntil, 1);
  return { end, trial, fullUntil, exportUntil, viewFrom, deleteAfter: addD(viewFrom, KEEP_DAYS) };
}
export function subStage(s: SubDates, today: string): Stage {
  const d = subDates(s);
  return today <= d.fullUntil ? "full" : today <= d.exportUntil ? "export" : "view";
}

export type SubState = "trial" | "active" | "grace" | "export" | "view" | "cancelled";
export function subState(s: Sub, today: string): SubState {
  const st = subStage(s, today);
  if (st === "view") return s.cancelled_at ? "cancelled" : "view";
  if (st === "export") return "export";
  if (today > subEnd(s)) return "grace";
  return isTrial(s) ? "trial" : "active";
}

// what the office sees: nothing, a warning before the end, grace (paid), read + export, or view only
export type OfficeSub = {
  phase: "ok" | "warn" | "grace" | "export" | "view";
  trial: boolean;
  daysLeft: number; // to the end of the current period
  end: string;
  fullUntil: string;
  exportUntil: string;
  deleteAfter: string;
};
export function officeSub(s: SubDates & { cycle_months?: number }, today: string): OfficeSub {
  const d = subDates(s);
  const st = subStage(s, today);
  const daysLeft = diff(d.end, today);
  const warnDays = !d.trial && (s.cycle_months ?? 1) >= 12 ? 30 : 7; // yearly plans are warned 30 days ahead, then 7
  const phase = st === "view" ? "view" : st === "export" ? "export" : daysLeft < 0 ? "grace" : daysLeft < warnDays ? "warn" : "ok";
  return { phase, trial: d.trial, daysLeft, end: d.end, fullUntil: d.fullUntil, exportUntil: d.exportUntil, deleteAfter: d.deleteAfter };
}

export const SUB_LABEL: Record<SubState, string> = { trial: "تجريبي", active: "نشط", grace: "سماح", export: "قراءة وتصدير", view: "مشاهدة فقط", cancelled: "ملغى" };
export const SUB_TONE: Record<SubState, string> = {
  trial: "bg-blue-50 text-blue-800",
  active: "bg-emerald-50 text-emerald-800",
  grace: "bg-amber-50 text-amber-800",
  export: "bg-orange-50 text-orange-800",
  view: "bg-red-50 text-red-800",
  cancelled: "bg-slate-100 text-slate-600",
};
