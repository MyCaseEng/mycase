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
export type SubState = "trial" | "active" | "late" | "cancelled";

export function subState(s: Sub, today: string): SubState {
  if (s.cancelled_at) return "cancelled";
  if (s.paid_until && s.paid_until >= today) return "active";
  if (s.trial_ends >= today) return "trial";
  return "late";
}

export const SUB_LABEL: Record<SubState, string> = { trial: "تجريبي", active: "نشط", late: "متأخر", cancelled: "ملغى" };
export const SUB_TONE: Record<SubState, string> = {
  trial: "bg-blue-50 text-blue-800",
  active: "bg-emerald-50 text-emerald-800",
  late: "bg-red-50 text-red-800",
  cancelled: "bg-slate-100 text-slate-600",
};
