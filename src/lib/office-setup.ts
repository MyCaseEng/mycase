import "server-only";
// Create the office of a new expert (they become its admin), with the sample case. Returns a clear error instead of failing silently.
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSampleCase } from "@/lib/sample";
import { validCountry } from "@/lib/countries";
import { validSpecialty } from "@/lib/specialties";
import { TERMS_VERSION } from "@/lib/terms";
import { isStaffEmail } from "@/lib/staff";

export type OfficeFields = { name: string; display: string; country: string; specialty: string; reg: string };
export type SetupRes = { ok: boolean; text: string } | null;

export function readFields(v: Record<string, unknown> | null | undefined): OfficeFields {
  const s = (k: string) => String(v?.[k] ?? "").trim();
  return { name: s("name").slice(0, 200), display: s("display").slice(0, 120), country: s("country"), specialty: s("specialty"), reg: s("reg").slice(0, 40) };
}

export async function makeOffice(supabase: SupabaseClient, f: OfficeFields): Promise<SetupRes> {
  if (!f.name) return { ok: false, text: "اكتب اسم المكتب." };
  if (!f.display) return { ok: false, text: "اكتب اسمك كما يظهر للفريق." };
  const { data: cl } = await supabase.auth.getClaims();
  const uid = cl?.claims?.sub as string | undefined;
  if (!uid) return { ok: false, text: "انتهت الجلسة. سجّل الدخول من جديد." };
  if (isStaffEmail(cl?.claims?.email as string | undefined)) return { ok: false, text: "حسابات الفريق لا تُنشئ مكاتب." };
  // one office per new account: if this person already belongs to one (the form was sent twice), it is done
  const { data: already } = await supabase.from("members").select("office_id").eq("user_id", uid).limit(1);
  if (already?.length) return { ok: true, text: "" };
  const { data: officeId, error } = await supabase.rpc("create_office", { p_name: f.name, p_display_name: f.display });
  if (error || !officeId) return { ok: false, text: "تعذّر إنشاء المكتب: " + (error?.message ?? "لا استجابة") };
  await supabase.rpc("accept_terms", { p_version: TERMS_VERSION });
  const { error: ue } = await supabase
    .from("offices")
    .update({ country: validCountry(f.country), specialty: validSpecialty(f.specialty), expert_reg: f.reg || null })
    .eq("id", officeId);
  await createSampleCase(supabase, officeId as string, uid);
  // make sure the account really sees its office before sending it in
  const { data: mine, error: me } = await supabase.from("members").select("office_id, offices(name)").eq("user_id", uid).eq("is_active", true).limit(1).maybeSingle();
  if (me || !mine) return { ok: false, text: "أُنشئ المكتب لكن تعذّر ربط حسابك به: " + (me?.message ?? "لا توجد عضوية") + ". راسل الدعم." };
  if (ue) return { ok: true, text: "أُنشئ المكتب، لكن لم تُحفظ الدولة أو التخصص أو رقم القيد: " + ue.message + ". عدّلها من الإعدادات." };
  return { ok: true, text: "" };
}
