import "server-only";
import { createClient } from "@/lib/supabase/server";
import { todayStr } from "@/lib/format";

export type Party = {
  id: string;
  side: 1 | 2 | 3;
  role: string;
  name: string;
  kind: string | null;
  phone: string | null;
  email: string | null;
  lawyer: string | null;
  lawyer_phone: string | null;
  lawyer_email: string | null;
  sort: number;
};
export type Ev = {
  id: string;
  type: "جلسة" | "اجتماع" | "معاينة";
  date: string;
  time: string | null;
  place: string | null;
  invited: string;
  note: string | null;
  created_at?: string;
};
export type Note = { id: string; body: string; author: string | null; created_at: string };
export type Case = {
  id: string;
  case_no: string | null;
  case_type: string | null;
  category: string;
  authority: string | null;
  assign_src: string | null;
  circuit: string | null;
  judge: string | null;
  secretary: string | null;
  mission: string | null;
  received: string | null;
  prelim_date: string | null;
  deadline: string | null;
  due_note: string | null;
  deposit_ordered: number | null;
  claim_value: number | null;
  project_value: number | null;
  supplementary: boolean;
  status: string;
  report_date: string | null;
  created_at: string;
  proc_num?: "party" | "time";
  parties: Party[];
  events: Ev[];
  case_team: { user_id: string; duty: "executor" | "coordinator" }[];
};
export type Member = { user_id: string; display_name: string; short_name: string | null; role: string; is_active: boolean };

const CASE_SELECT =
  "id, case_no, case_type, category, authority, assign_src, circuit, judge, secretary, mission, received, prelim_date, deadline, due_note, deposit_ordered, claim_value, project_value, supplementary, status, report_date, created_at, proc_num, parties(*), events(*), case_team(user_id, duty)";

export async function listCases(officeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cases")
    .select(CASE_SELECT)
    .eq("office_id", officeId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Case[];
}

export async function getCase(officeId: string, id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cases")
    .select(CASE_SELECT)
    .eq("office_id", officeId)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  return data as unknown as Case | null;
}

export async function listMembers(officeId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select("user_id, display_name, short_name, role, is_active")
    .eq("office_id", officeId)
    .order("created_at");
  return (data ?? []) as Member[];
}

export async function listNotes(caseId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("notes").select("id, body, author, created_at").eq("case_id", caseId).order("created_at", { ascending: false });
  return (data ?? []) as Note[];
}

// ---- derived values shared by list and case page ----
export const isDelivered = (c: Pick<Case, "report_date" | "status">) => !!c.report_date || c.status === "تم التسليم";
export const hearingsOf = (c: Pick<Case, "events">) =>
  c.events.filter((e) => e.type === "جلسة").sort((a, b) => a.date.localeCompare(b.date));
export const nextHearing = (c: Pick<Case, "events">) => hearingsOf(c).find((h) => h.date >= todayStr()) ?? null;
export const lastHearing = (c: Pick<Case, "events">) => hearingsOf(c).at(-1) ?? null;
export const sideOf = (c: Pick<Case, "parties">, s: 1 | 2 | 3) =>
  c.parties.filter((p) => p.side === s).sort((a, b) => a.sort - b.sort);
export const appointmentsOf = (c: Pick<Case, "events">) =>
  c.events.filter((e) => e.type !== "جلسة").sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")));

export type QLetter = {
  id: string;
  party_id: string | null;
  addressee: string | null;
  letter_date: string;
  days: number;
  due: string | null;
  questions: string[];
  ref_id: string | null;
  sent_at: string | null;
  reply_type: "partial" | "full" | null;
  reply_date: string | null;
  reply_note: string | null;
  send_to?: "party" | "lawyer";
};
export async function listLetters(caseId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("question_letters").select("*").eq("case_id", caseId).order("created_at");
  return (data ?? []) as QLetter[];
}
export async function listRefs(officeId: string, caseId?: string) {
  const supabase = await createClient();
  let q = supabase.from("ref_numbers").select("*").eq("office_id", officeId);
  if (caseId) q = q.eq("case_id", caseId);
  const { data } = await q.order("year", { ascending: false }).order("seq", { ascending: false });
  return (data ?? []) as import("@/lib/refs").Ref[];
}
export const qOpen = (l: QLetter) => !l.reply_date || l.reply_type === "partial";

// Everything the home board, the bell and the alerts need, in three queries.
export async function loadBoard(officeId: string) {
  const supabase = await createClient();
  const [cases, letters, snoozes] = await Promise.all([
    listCases(officeId),
    supabase.from("question_letters").select("*").eq("office_id", officeId).then((r) => (r.data ?? []) as (QLetter & { case_id: string })[]),
    supabase.from("alert_snoozes").select("case_id, alert_key, until").eq("office_id", officeId).then((r) => (r.data ?? []) as { case_id: string; alert_key: string; until: string }[]),
  ]);
  const lettersOf = (id: string) => letters.filter((l) => l.case_id === id);
  return { cases, lettersOf, snoozes };
}

export const caseLabel = (c: Pick<Case, "case_no" | "case_type" | "parties">) =>
  c.case_no
    ? `${c.case_no.trim()} ${c.case_type ?? ""}`.trim()
    : c.parties.filter((p) => p.side !== 3).map((p) => p.name).slice(0, 2).join(" ضد ") || "دعوى بدون رقم";

export async function listProcRows(caseId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("procedures").select("id, auto_key, date, body, hidden, att").eq("case_id", caseId);
  return (data ?? []) as import("@/lib/docs").ProcRow[];
}
export async function getOfficeInfo(officeId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("offices").select("expert_name, address").eq("id", officeId).single();
  return { expertName: data?.expert_name ?? "", address: data?.address ?? "" };
}
