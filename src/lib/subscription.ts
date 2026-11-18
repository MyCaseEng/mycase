// Where an office's subscription stands. Pure, shared by the owner page and (later) the office.
export type Sub = {
  office_id: string;
  plan: string;
  price: number | null;
  cycle_months: number;
  trial_ends: string;
  paid_until: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  note: string | null;
  paid_total: number;
  last_paid: string | null;
};
export const GRACE_DAYS = 7; // full use after the end, then read-only (same rule as sub_locked() in the database)
export const WARN_DAYS = 14; // the office admin is warned this many days before the end

const diff = (a: string, b: string) => Math.round((Date.parse(a + "T00:00:00Z") - Date.parse(b + "T00:00:00Z")) / 86400000);

// the last day the office may use the platform fully
export function subEnd(s: Pick<Sub, "trial_ends" | "paid_until" | "cancelled_at">): string {
  if (s.cancelled_at) return s.cancelled_at;
  return s.paid_until && s.paid_until > s.trial_ends ? s.paid_until : s.trial_ends;
}

export type SubState = "trial" | "active" | "grace" | "locked" | "cancelled";

export function subState(s: Sub, today: string): SubState {
  const end = subEnd(s);
  const past = diff(today, end); // days since the end
  if (past > GRACE_DAYS) return s.cancelled_at ? "cancelled" : "locked";
  if (past > 0) return "grace";
  if (s.cancelled_at) return "grace";
  return s.paid_until && s.paid_until >= today ? "active" : "trial";
}

// what the office itself sees: nothing, a warning, the grace banner, or read-only
export type OfficeSub = { phase: "ok" | "warn" | "grace" | "locked"; end: string; daysLeft: number; trial: boolean };
export function officeSub(s: Sub, today: string): OfficeSub {
  const end = subEnd(s);
  const daysLeft = diff(end, today);
  const trial = !s.paid_until || s.paid_until < s.trial_ends;
  const phase = daysLeft < -GRACE_DAYS ? "locked" : daysLeft < 0 ? "grace" : daysLeft <= WARN_DAYS ? "warn" : "ok";
  return { phase, end, daysLeft, trial };
}

export const SUB_LABEL: Record<SubState, string> = { trial: "تجريبي", active: "نشط", grace: "فترة سماح", locked: "قراءة فقط", cancelled: "ملغى" };
export const SUB_TONE: Record<SubState, string> = {
  trial: "bg-blue-50 text-blue-800",
  active: "bg-emerald-50 text-emerald-800",
  grace: "bg-amber-50 text-amber-800",
  locked: "bg-red-50 text-red-800",
  cancelled: "bg-slate-100 text-slate-600",
};
