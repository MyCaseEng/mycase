"use server";
// Platform owner actions. Every one of them is checked again in the database (is_platform_admin).
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Res = { ok: boolean; text: string };
const fail = (e: { message: string } | null): Res | null => (e ? { ok: false, text: e.message } : null);

export async function setOfficeActive(id: string, active: boolean): Promise<Res> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_set_office_active", { p_office: id, p_active: active });
  revalidatePath("/platform");
  return fail(error) ?? { ok: true, text: active ? "أُعيد تفعيل المكتب." : "أوقف المكتب." };
}

export async function deleteOffice(id: string, confirmName: string): Promise<Res> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_delete_office", { p_office: id, p_confirm_name: confirmName });
  revalidatePath("/platform");
  return fail(error) ?? { ok: true, text: "حُذف المكتب نهائياً." };
}

export async function answerTicket(id: string, reply: string, status: "open" | "done"): Promise<Res> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_answer_ticket", { p_id: id, p_reply: reply, p_status: status });
  revalidatePath("/platform");
  return fail(error) ?? { ok: true, text: "حُفظ." };
}

// ---- subscriptions (kept by hand until online payment) ----
export async function saveSubscription(office: string, f: { plan: string; price: number | null; cycle: number; trialEnds: string; note: string }): Promise<Res> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_set_subscription", {
    p_office: office, p_plan: f.plan, p_price: f.price, p_cycle: f.cycle, p_trial_ends: f.trialEnds, p_note: f.note,
  });
  revalidatePath("/platform");
  return fail(error) ?? { ok: true, text: "حُفظ." };
}

export async function renewSubscription(office: string, months: number, amount: number | null, paidOn: string, note: string): Promise<Res> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("platform_renew", { p_office: office, p_months: months, p_amount: amount, p_paid_on: paidOn, p_note: note });
  revalidatePath("/platform");
  return fail(error) ?? { ok: true, text: `سُجّلت الدفعة، والاشتراك ساري حتى ${String(data).replace(/-/g, ".")}.` };
}

export async function cancelSubscription(office: string, reason: string): Promise<Res> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_cancel_subscription", { p_office: office, p_reason: reason });
  revalidatePath("/platform");
  return fail(error) ?? { ok: true, text: "أُلغي الاشتراك." };
}
