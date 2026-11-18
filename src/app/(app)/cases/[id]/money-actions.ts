"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCtx } from "@/lib/office";

export type PayInput = {
  kind: "deposit" | "fee";
  party_id: string | null;
  payer_name: string | null;
  amount: number;
  paid_on: string;
  receipt_no: string | null;
  file_path: string | null;
  note: string | null;
};

// Record a deposit paid to the court, or fees the court paid out to the expert.
export async function addPayment(caseId: string, p: PayInput): Promise<{ ok: boolean; text: string }> {
  const ctx = await getCtx();
  if (ctx.role === "viewer") return { ok: false, text: "لا تملك صلاحية التعديل." };
  if (!(p.amount > 0)) return { ok: false, text: "اكتب المبلغ." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.paid_on)) return { ok: false, text: "اختر التاريخ." };
  if (p.file_path && !p.file_path.startsWith(`${ctx.officeId}/${caseId}/receipts/`)) return { ok: false, text: "مسار الإيصال غير صحيح." };
  const supabase = await createClient();
  const { error } = await supabase.from("case_payments").insert({
    case_id: caseId,
    office_id: ctx.officeId,
    kind: p.kind === "fee" ? "fee" : "deposit",
    party_id: p.party_id || null,
    payer_name: p.payer_name?.trim().slice(0, 120) || null,
    amount: p.amount,
    paid_on: p.paid_on,
    receipt_no: p.receipt_no?.trim().slice(0, 60) || null,
    file_path: p.file_path || null,
    note: p.note?.trim().slice(0, 300) || null,
  });
  if (error) return { ok: false, text: /case_payments/.test(error.message) ? "حدّث قاعدة البيانات أولًا (ملف 0020)." : error.message };
  await supabase.from("activity").insert({
    office_id: ctx.officeId, action: p.kind === "fee" ? "تسجيل صرف أتعاب" : "تسجيل سداد أمانة", case_id: caseId, case_label: null,
    detail: { amount: p.amount, paid_on: p.paid_on },
  });
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/");
  return { ok: true, text: "تم التسجيل" };
}

export async function deletePayment(caseId: string, id: string) {
  const ctx = await getCtx();
  if (ctx.role === "viewer") return;
  const supabase = await createClient();
  const { data } = await supabase.from("case_payments").delete().eq("id", id).eq("office_id", ctx.officeId).select("file_path").maybeSingle();
  if (data?.file_path) await supabase.storage.from("case-files").remove([data.file_path]);
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/");
}

export async function receiptUrl(path: string) {
  const ctx = await getCtx();
  if (!path.startsWith(`${ctx.officeId}/`)) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("case-files").createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}
