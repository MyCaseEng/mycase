"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCtx } from "@/lib/office";


// The office template for a kind: the one for this assigning body if uploaded, else the general one.
// The office's own uploaded template for this kind (or for this assigning body); otherwise the platform's standard form.
export async function getTemplate(kind: string, src: string | null): Promise<{ b64: string } | { standard: true }> {
  const ctx = await getCtx();
  const supabase = await createClient();
  const { data } = await supabase.from("templates").select("assign_src, content").eq("office_id", ctx.officeId).eq("kind", kind);
  const pick = (data ?? []).find((t) => src && t.assign_src === src) ?? (data ?? []).find((t) => !t.assign_src);
  if (!pick?.content) return { standard: true };
  return { b64: pick.content };
}

export async function logDoc(caseId: string, action: string, detail: string) {
  const ctx = await getCtx();
  const supabase = await createClient();
  await supabase.from("activity").insert({ office_id: ctx.officeId, action, case_id: caseId, detail: { name: detail } });
}

/* ---- mission procedures ---- */
const touch = (caseId: string) => {
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/procedures");
};

export async function setProcOverride(caseId: string, key: string, patch: { body?: string | null; hidden?: boolean }) {
  const ctx = await getCtx();
  const supabase = await createClient();
  const { data: cur } = await supabase.from("procedures").select("id, body, hidden").eq("case_id", caseId).eq("auto_key", key).maybeSingle();
  if (cur) await supabase.from("procedures").update(patch).eq("id", cur.id);
  else await supabase.from("procedures").insert({ case_id: caseId, office_id: ctx.officeId, auto_key: key, body: patch.body ?? null, hidden: patch.hidden ?? false });
  touch(caseId);
}

export async function saveManualProc(caseId: string, id: string | null, date: string, body: string, att: string) {
  const ctx = await getCtx();
  const supabase = await createClient();
  if (id) await supabase.from("procedures").update({ date, body, att: att || null }).eq("id", id).eq("office_id", ctx.officeId);
  else await supabase.from("procedures").insert({ case_id: caseId, office_id: ctx.officeId, date, body, att: att || null });
  touch(caseId);
}

export async function deleteManualProc(caseId: string, id: string) {
  const ctx = await getCtx();
  const supabase = await createClient();
  await supabase.from("procedures").delete().eq("id", id).eq("office_id", ctx.officeId);
  touch(caseId);
}

export async function setProcNum(caseId: string, mode: "party" | "time") {
  const ctx = await getCtx();
  const supabase = await createClient();
  await supabase.from("cases").update({ proc_num: mode }).eq("id", caseId).eq("office_id", ctx.officeId);
  touch(caseId);
}

export async function setLetterSendTo(caseId: string, letterId: string, to: "party" | "lawyer") {
  const ctx = await getCtx();
  const supabase = await createClient();
  await supabase.from("question_letters").update({ send_to: to }).eq("id", letterId).eq("office_id", ctx.officeId);
  revalidatePath(`/cases/${caseId}`);
}
