"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCtx } from "@/lib/office";
import { createAdminClient } from "@/lib/supabase/admin";
import { officeLoginCode, staffEmail, tempPassword, validUser } from "@/lib/staff";

export type Result = { ok: boolean; text: string } | null;
export type StaffResult = { ok: boolean; text: string; login?: string; password?: string } | null;
const NO_KEY = "إنشاء حسابات الفريق غير مفعّل بعد على الخادم. تواصل مع الدعم.";

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
  if (ctx.role !== "admin") return { ok: false, text: "لمدير المكتب فقط." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("members")
    .update({ is_active: active })
    .eq("office_id", ctx.officeId)
    .eq("user_id", userId);
  if (error) return { ok: false, text: msg(error) };
  const admin = createAdminClient();
  if (admin) {
    const { data: m } = await admin.from("members").select("login").eq("office_id", ctx.officeId).eq("user_id", userId).maybeSingle();
    if (m?.login) await admin.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : "876000h" });
  }
  await log(active ? "إعادة تفعيل عضو" : "إيقاف عضو", { userId });
  revalidatePath("/team");
  return { ok: true, text: active ? "أُعيد تفعيل العضو." : "أُوقف العضو." };
}

// The expert creates a team member's account: login ID like ahmed@qat123 and a temporary password shown once.
export async function addStaff(_: StaffResult, form: FormData): Promise<StaffResult> {
  const ctx = await getCtx();
  if (ctx.role !== "admin") return { ok: false, text: "إضافة الفريق لمدير المكتب فقط." };
  const display = String(form.get("display") || "").trim().slice(0, 60);
  const user = String(form.get("user") || "").trim().toLowerCase();
  const role = ["admin", "member", "viewer"].includes(String(form.get("role"))) ? String(form.get("role")) : "member";
  if (!display) return { ok: false, text: "اكتب الاسم كما يظهر للفريق." };
  if (!validUser(user)) return { ok: false, text: "اسم الدخول بالحروف الإنجليزية الصغيرة والأرقام، يبدأ بحرف (مثل: ahmed)." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, text: NO_KEY };

  const { data: o } = await admin.from("offices").select("country, expert_reg, login_code").eq("id", ctx.officeId).single();
  let code = o?.login_code as string | null;
  if (!code) {
    code = officeLoginCode(o?.country, o?.expert_reg);
    if (!code) return { ok: false, text: "أدخل رقم قيد الخبير من «الإعدادات» أولًا، فمنه يتكوّن رمز مكتبك." };
    const { error } = await admin.from("offices").update({ login_code: code }).eq("id", ctx.officeId);
    if (error) return { ok: false, text: error.code === "23505" ? "رمز المكتب مستخدم في مكتب آخر. تأكد من رقم القيد أو تواصل مع الدعم." : error.message };
  }
  const login = `${user}@${code}`;
  const password = tempPassword();
  const { data: made, error } = await admin.auth.admin.createUser({
    email: staffEmail(user, code),
    password,
    email_confirm: true,
    user_metadata: { must_change: true, display_name: display },
  });
  if (error || !made.user) {
    const taken = /already|registered|exists/i.test(error?.message ?? "");
    return { ok: false, text: taken ? `المعرّف ${login} مستخدم من قبل. اختر اسمًا آخر.` : error?.message ?? "تعذّر إنشاء الحساب." };
  }
  const { error: me } = await admin
    .from("members")
    .insert({ office_id: ctx.officeId, user_id: made.user.id, role, display_name: display, login });
  if (me) {
    await admin.auth.admin.deleteUser(made.user.id);
    return { ok: false, text: me.message };
  }
  await log("إضافة عضو", { login, role });
  revalidatePath("/team");
  return { ok: true, text: `أُنشئ حساب ${display}.`, login, password };
}

// New temporary password for a team member who forgot theirs (team accounts only, never a personal e-mail account).
export async function resetStaffPassword(userId: string): Promise<StaffResult> {
  const ctx = await getCtx();
  if (ctx.role !== "admin") return { ok: false, text: "لمدير المكتب فقط." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, text: NO_KEY };
  const { data: m } = await admin.from("members").select("login, display_name").eq("office_id", ctx.officeId).eq("user_id", userId).maybeSingle();
  if (!m?.login) return { ok: false, text: "هذا الحساب يدخل ببريده الشخصي، ويستعيد كلمة مروره بنفسه." };
  const password = tempPassword();
  const { error } = await admin.auth.admin.updateUserById(userId, { password, user_metadata: { must_change: true } });
  if (error) return { ok: false, text: error.message };
  await log("إعادة تعيين كلمة مرور", { login: m.login });
  return { ok: true, text: `كلمة مرور مؤقتة جديدة لـ ${m.display_name}.`, login: m.login, password };
}
