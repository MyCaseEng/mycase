"use server";
// Platform owner actions. Every one of them is checked again in the database (is_platform_admin).
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Res = { ok: boolean; text: string };
const fail = (e: { message: string } | null): Res | null => (e ? { ok: false, text: e.message } : null);

export async function setOfficeActive(id: string, active: boolean): Promise<Res> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_set_office_active", { p_office: id, p_active: active });
  revalidatePath("/platform");
  return fail(error) ?? { ok: true, text: active ? "أُعيد تفعيل المكتب." : "أوقف المكتب." };
}

// Deleting an office also removes the accounts of its people (expert and team) that belong to no other office,
// so the email can sign up again as new. The platform owner's own account is never removed.
export async function deleteOffice(id: string, confirmName: string): Promise<Res> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: people } = admin ? await admin.from("members").select("user_id").eq("office_id", id) : { data: [] };
  const { error } = await supabase.rpc("platform_delete_office", { p_office: id, p_confirm_name: confirmName });
  if (error) return { ok: false, text: error.message };
  const left = await removeAccounts(((people ?? []) as { user_id: string }[]).map((p) => p.user_id));
  revalidatePath("/platform");
  return { ok: true, text: admin ? `حُذف المكتب نهائياً مع حسابات أعضائه${left ? ` (بقي ${left} لم يُحذف)` : ""}.` : "حُذف المكتب، لكن حسابات أعضائه بقيت: مفتاح الخدمة غير مضبوط." };
}

// Remove sign-in accounts that have no office left. Returns how many could not be removed.
async function removeAccounts(ids: string[]): Promise<number> {
  const admin = createAdminClient();
  if (!admin || !ids.length) return 0;
  const [{ data: still }, { data: owners }] = await Promise.all([
    admin.from("members").select("user_id").in("user_id", ids),
    admin.from("platform_admins").select("user_id").in("user_id", ids),
  ]);
  const keep = new Set([...(still ?? []), ...(owners ?? [])].map((x) => x.user_id as string));
  let failed = 0;
  for (const uid of ids.filter((x) => !keep.has(x))) {
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) failed++;
  }
  return failed;
}

// Accounts that signed in but have no office (an office was deleted before this rule, or a sign-up never finished)
export async function deleteOrphan(userId: string): Promise<Res> {
  const supabase = await createClient();
  const { data: owner } = await supabase.rpc("is_platform_admin");
  if (!owner) return { ok: false, text: "غير مسموح." };
  const failed = await removeAccounts([userId]);
  revalidatePath("/platform");
  return failed ? { ok: false, text: "تعذّر حذف الحساب." } : { ok: true, text: "حُذف الحساب." };
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
