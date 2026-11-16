"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCtx } from "@/lib/office";

export type Result = { ok: boolean; text: string } | null;

const AR: Record<string, string> = {
  "23505": "هذا البريد مدعو من قبل.",
  "42501": "لا تملك صلاحية هذا الإجراء.",
};
const msg = (e: { code?: string; message: string }) => AR[e.code ?? ""] || e.message;

async function log(action: string, detail: Record<string, unknown>) {
  const ctx = await getCtx();
  const supabase = await createClient();
  await supabase.from("activity").insert({ office_id: ctx.officeId, action, detail });
}

export async function invite(_: Result, form: FormData): Promise<Result> {
  const ctx = await getCtx();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const display = String(form.get("display") || "").trim();
  const role = String(form.get("role") || "member");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, text: "البريد غير صحيح." };
  if (!display) return { ok: false, text: "اكتب الاسم كما يظهر للفريق." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("invitations")
    .insert({ office_id: ctx.officeId, email, display_name: display, role });
  if (error) return { ok: false, text: msg(error) };
  await log("دعوة عضو", { email, role });
  revalidatePath("/team");
  return { ok: true, text: `دُعي ${display}. يكفي أن ينشئ حساباً بهذا البريد في المنصة.` };
}

export async function cancelInvite(id: string) {
  const supabase = await createClient();
  await supabase.from("invitations").delete().eq("id", id);
  revalidatePath("/team");
}

export async function setRole(userId: string, role: string): Promise<Result> {
  const ctx = await getCtx();
  const supabase = await createClient();
  const { error } = await supabase.from("members").update({ role }).eq("office_id", ctx.officeId).eq("user_id", userId);
  if (error) return { ok: false, text: msg(error) };
  await log("تغيير صلاحية", { userId, role });
  revalidatePath("/team");
  return { ok: true, text: "حُفظت الصلاحية." };
}

export async function setActive(userId: string, active: boolean): Promise<Result> {
  const ctx = await getCtx();
  const supabase = await createClient();
  const { error } = await supabase
    .from("members")
    .update({ is_active: active })
    .eq("office_id", ctx.officeId)
    .eq("user_id", userId);
  if (error) return { ok: false, text: msg(error) };
  await log(active ? "إعادة تفعيل عضو" : "إيقاف عضو", { userId });
  revalidatePath("/team");
  return { ok: true, text: active ? "أُعيد تفعيل العضو." : "أُوقف العضو." };
}
