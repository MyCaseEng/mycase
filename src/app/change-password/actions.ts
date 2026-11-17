"use server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaffEmail } from "@/lib/staff";

// Replaces a team account's temporary password on the server, then clears the flag. No token refresh needed.
export async function changeOwnPassword(password: string): Promise<{ ok: boolean; text: string }> {
  if (password.length < 8) return { ok: false, text: "كلمة المرور 8 أحرف على الأقل." };
  const supabase = await createClient();
  const { data: cl } = await supabase.auth.getClaims();
  const uid = cl?.claims?.sub;
  if (!uid) return { ok: false, text: "انتهت الجلسة. سجّل الدخول من جديد." };
  if (!isStaffEmail(cl.claims.email as string | undefined)) return { ok: false, text: "هذه الصفحة لحسابات الفريق فقط." };
  const admin = createAdminClient();
  if (!admin) return { ok: false, text: "الخدمة غير مفعّلة على الخادم." };
  const { error } = await admin.auth.admin.updateUserById(uid, { password, user_metadata: { must_change: false } });
  if (error) return { ok: false, text: error.message };
  await admin.from("members").update({ must_change: false }).eq("user_id", uid);
  return { ok: true, text: "" };
}
