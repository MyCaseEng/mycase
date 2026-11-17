"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCtx } from "@/lib/office";
import { getSettings } from "@/lib/settings";
import { refText, showRef, type Ref } from "@/lib/refs";

const NO_REG = "أدخل رقم قيد الخبير من «الإعدادات» أولًا، لأنه جزء من الرقم المرجعي.";
const refError = (e: { code?: string; message: string }) =>
  e.message.includes("NO_REG") ? NO_REG : e.code === "42501" ? "لا تملك صلاحية إصدار الأرقام." : e.message;

export type IssueRes = { ok: boolean; text: string; ref?: string; id?: string } | null;

// Issues the next number atomically in the database (no duplicates even when two people click together).
export async function issueRef(caseId: string | null, category: string, title: string | null, eventId: string | null = null): Promise<IssueRes> {
  const ctx = await getCtx();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("issue_ref_number", {
    p_office: ctx.officeId,
    p_category: category,
    p_case: caseId,
    p_event: eventId,
    p_title: title,
  });
  if (error) return { ok: false, text: refError(error) };
  const r = data as Ref;
  const s = await getSettings(ctx.officeId);
  const ref = refText(r, s.refPrefix);
  await supabase.from("activity").insert({ office_id: ctx.officeId, action: "إصدار رقم مرجعي", case_id: caseId, detail: { ref, category } });
  revalidatePath("/refs");
  if (caseId) revalidatePath(`/cases/${caseId}`);
  return { ok: true, text: `صدر الرقم ${showRef(ref)}`, ref, id: r.id };
}

export async function issueFromForm(_: IssueRes, f: FormData): Promise<IssueRes> {
  const cat = String(f.get("category") || "");
  if (!cat) return { ok: false, text: "اختر نوع المستند." };
  const caseId = String(f.get("case_id") || "") || null;
  const title = String(f.get("title") || "").trim() || null;
  return issueRef(caseId, cat, title);
}

export async function setRefStatus(id: string, cancelled: boolean, caseId: string | null) {
  const ctx = await getCtx();
  const supabase = await createClient();
  await supabase.from("ref_numbers").update({ status: cancelled ? "ملغى" : "فعال" }).eq("id", id).eq("office_id", ctx.officeId);
  await supabase.from("activity").insert({ office_id: ctx.officeId, action: cancelled ? "إلغاء رقم مرجعي" : "إعادة تفعيل رقم مرجعي", case_id: caseId, detail: { id } });
  revalidatePath("/refs");
  if (caseId) revalidatePath(`/cases/${caseId}`);
}
