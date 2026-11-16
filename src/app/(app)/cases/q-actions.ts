"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCtx } from "@/lib/office";
import { addressee } from "@/lib/format";
import { issueRef } from "../refs/actions";

export type QRes = { ok: boolean; text: string } | null;

const addDays = (d: string, n: number) => {
  const t = new Date(d + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

async function done(caseId: string, action: string, detail?: Record<string, unknown>) {
  const ctx = await getCtx();
  const supabase = await createClient();
  await supabase.from("activity").insert({ office_id: ctx.officeId, action, case_id: caseId, detail: detail ?? null });
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/");
}

// One letter per selected party, same questions, date and reply period.
export async function createLetters(caseId: string, _: QRes, f: FormData): Promise<QRes> {
  const ctx = await getCtx();
  const supabase = await createClient();
  const partyIds = f.getAll("party").map(String);
  const date = String(f.get("letter_date") || "");
  const days = Number(f.get("days") || 5);
  const questions = String(f.get("questions") || "").split("\n").map((q) => q.trim()).filter(Boolean);
  const withRef = f.get("with_ref") === "on";
  if (!partyIds.length) return { ok: false, text: "اختر طرفاً واحداً على الأقل." };
  if (!date) return { ok: false, text: "اختر تاريخ الخطاب." };
  if (!questions.length) return { ok: false, text: "أضف سؤالاً واحداً على الأقل." };
  const { data: parties } = await supabase.from("parties").select("id, name, role").eq("case_id", caseId).in("id", partyIds);
  for (const p of parties ?? []) {
    let refId: string | null = null;
    if (withRef) {
      const { data } = await supabase.rpc("issue_ref_number", {
        p_office: ctx.officeId, p_category: "أسئلة واستفسارات", p_case: caseId, p_event: null, p_title: `أسئلة واستفسارات — ${p.name}`,
      });
      refId = (data as { id: string } | null)?.id ?? null;
    }
    const { error } = await supabase.from("question_letters").insert({
      case_id: caseId, office_id: ctx.officeId, party_id: p.id, addressee: addressee(p.name),
      letter_date: date, days, due: addDays(date, days), questions, ref_id: refId,
    });
    if (error) return { ok: false, text: error.message };
  }
  await done(caseId, "إعداد خطابات الأسئلة", { parties: (parties ?? []).map((p) => p.name) });
  revalidatePath("/refs");
  return { ok: true, text: "أُعدّت الخطابات." };
}

export async function updateLetter(caseId: string, id: string, _: QRes, f: FormData): Promise<QRes> {
  const ctx = await getCtx();
  const supabase = await createClient();
  const date = String(f.get("letter_date") || "");
  const days = Number(f.get("days") || 5);
  const questions = String(f.get("questions") || "").split("\n").map((q) => q.trim()).filter(Boolean);
  const due = String(f.get("due") || "") || addDays(date, days);
  const { error } = await supabase
    .from("question_letters")
    .update({ letter_date: date, days, due, questions })
    .eq("id", id)
    .eq("office_id", ctx.officeId);
  if (error) return { ok: false, text: error.message };
  await done(caseId, "تعديل خطاب الأسئلة");
  return { ok: true, text: "حُفظ." };
}

export async function markSent(caseId: string, id: string, sent: boolean) {
  const ctx = await getCtx();
  const supabase = await createClient();
  await supabase.from("question_letters").update({ sent_at: sent ? new Date().toISOString() : null }).eq("id", id).eq("office_id", ctx.officeId);
  await done(caseId, sent ? "إرسال خطاب الأسئلة" : "إلغاء علامة الإرسال");
}

export async function setReply(caseId: string, id: string, type: "partial" | "full" | null, date: string | null, note: string | null = null) {
  const ctx = await getCtx();
  const supabase = await createClient();
  await supabase
    .from("question_letters")
    .update({ reply_type: type, reply_date: type ? date : null, reply_note: note })
    .eq("id", id)
    .eq("office_id", ctx.officeId);
  await done(caseId, type === "full" ? "اكتمال رد الطرف" : type === "partial" ? "رد جزئي من الطرف" : "إلغاء تسجيل الرد");
}

export async function extendLetter(caseId: string, id: string, due: string) {
  const ctx = await getCtx();
  const supabase = await createClient();
  await supabase.from("question_letters").update({ due }).eq("id", id).eq("office_id", ctx.officeId);
  await done(caseId, "تمديد مهلة الرد", { due });
}

export async function deleteLetter(caseId: string, id: string) {
  const ctx = await getCtx();
  const supabase = await createClient();
  await supabase.from("question_letters").delete().eq("id", id).eq("office_id", ctx.officeId);
  await done(caseId, "حذف خطاب الأسئلة");
}

export async function issueLetterRef(caseId: string, id: string, partyName: string) {
  const r = await issueRef(caseId, "أسئلة واستفسارات", `أسئلة واستفسارات — ${partyName}`);
  if (!r?.ok || !r.id) return r;
  const ctx = await getCtx();
  const supabase = await createClient();
  await supabase.from("question_letters").update({ ref_id: r.id }).eq("id", id).eq("office_id", ctx.officeId);
  revalidatePath(`/cases/${caseId}`);
  return r;
}
