"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { makeOffice, readFields, type SetupRes } from "@/lib/office-setup";

// The office form on the welcome page (accounts made before the one-step sign-up, or when the automatic setup failed)
export async function createOfficeForm(_: SetupRes, f: FormData): Promise<SetupRes> {
  if (f.get("agree") !== "on") return { ok: false, text: "يلزم الموافقة على شروط الاستخدام." };
  const supabase = await createClient();
  const r = await makeOffice(supabase, readFields(Object.fromEntries([...f.entries()].map(([k, v]) => [k, String(v)]))));
  if (r?.ok && !r.text) redirect("/");
  return r;
}

// The one-step sign-up keeps the office details with the account; the first visit creates the office from them.
export async function createFromSignup(): Promise<SetupRes> {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  const office = (u.user?.user_metadata as { office?: Record<string, unknown> } | undefined)?.office;
  if (!office) return { ok: false, text: "لم تُحفظ بيانات المكتب مع الحساب. أكمل النموذج أدناه." };
  return makeOffice(supabase, readFields(office));
}
