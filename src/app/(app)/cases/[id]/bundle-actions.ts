"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCtx } from "@/lib/office";
import type { BundleItem, Grp } from "@/lib/bundle";

type R = { ok: boolean; text: string };
const GRPS: Grp[] = ["court", "reply", "minutes", "party"];
const clean = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);
const MISSING = "حدّث قاعدة البيانات أولًا (ملف 0021).";

async function writer() {
  const ctx = await getCtx();
  if (ctx.role === "viewer") return null;
  return { ctx, supabase: await createClient() };
}
const done = (caseId: string) => {
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/procedures");
};
const fail = (m: string): R => ({ ok: false, text: /bundle_items|case_final/.test(m) ? MISSING : m });

type Draft = Pick<BundleItem, "grp" | "party_id" | "provider" | "title" | "doc_date" | "sort" | "auto_key">;
const row = (d: Draft) => ({
  grp: GRPS.includes(d.grp) ? d.grp : "party",
  party_id: d.party_id || null,
  provider: clean(d.provider, 120),
  title: clean(d.title, 300),
  doc_date: clean(d.doc_date, 40),
  sort: Number.isFinite(d.sort) ? Math.round(d.sort) : 0,
});

// add the rows the platform knows (judgment, replies, minutes) that are not in the index yet; rows already there stay as edited
export async function addAutoItems(caseId: string, drafts: Draft[]): Promise<R> {
  const w = await writer();
  if (!w) return { ok: false, text: "لا تملك صلاحية التعديل." };
  const { data: have, error: e1 } = await w.supabase.from("bundle_items").select("auto_key").eq("case_id", caseId).not("auto_key", "is", null);
  if (e1) return fail(e1.message);
  const known = new Set((have ?? []).map((r) => r.auto_key));
  const add = drafts.filter((d) => d.auto_key && !known.has(d.auto_key)).map((d) => ({ ...row(d), auto_key: d.auto_key, case_id: caseId, office_id: w.ctx.officeId }));
  if (!add.length) return { ok: true, text: "لا بنود جديدة." };
  const { error } = await w.supabase.from("bundle_items").insert(add);
  if (error) return fail(error.message);
  done(caseId);
  return { ok: true, text: `أُضيف ${add.length} بند.` };
}

export async function saveItem(caseId: string, id: string | null, d: Draft): Promise<R> {
  const w = await writer();
  if (!w) return { ok: false, text: "لا تملك صلاحية التعديل." };
  if (!clean(d.title, 300)) return { ok: false, text: "اكتب اسم المستند." };
  const q = id
    ? w.supabase.from("bundle_items").update(row(d)).eq("id", id).eq("office_id", w.ctx.officeId)
    : w.supabase.from("bundle_items").insert({ ...row(d), case_id: caseId, office_id: w.ctx.officeId });
  const { error } = await q;
  if (error) return fail(error.message);
  done(caseId);
  return { ok: true, text: "تم الحفظ" };
}

export async function deleteItem(caseId: string, id: string) {
  const w = await writer();
  if (!w) return;
  await w.supabase.from("bundle_items").delete().eq("id", id).eq("office_id", w.ctx.officeId);
  done(caseId);
}

// move a row up or down inside its group: give the group's rows fresh consecutive sort values
export async function moveItem(caseId: string, ids: string[]) {
  const w = await writer();
  if (!w) return;
  await Promise.all(ids.map((id, i) => w.supabase.from("bundle_items").update({ sort: i + 1 }).eq("id", id).eq("office_id", w.ctx.officeId)));
  done(caseId);
}

export async function saveFinal(caseId: string, patch: { bundle_link?: string | null; report_path?: string | null; bundle_path?: string | null; word_path?: string | null }): Promise<R> {
  const w = await writer();
  if (!w) return { ok: false, text: "لا تملك صلاحية التعديل." };
  const prefix = `${w.ctx.officeId}/${caseId}/final/`;
  for (const k of ["report_path", "bundle_path", "word_path"] as const) {
    const v = patch[k];
    if (v && !v.startsWith(prefix)) return { ok: false, text: "مسار الملف غير صحيح." };
  }
  if (patch.bundle_link != null) {
    patch.bundle_link = clean(patch.bundle_link, 500) || null;
    if (patch.bundle_link && !/^https?:\/\//i.test(patch.bundle_link)) return { ok: false, text: "الرابط يجب أن يبدأ بـ https://" };
  }
  // replacing a file removes the old one
  const { data: old } = await w.supabase.from("case_final").select("*").eq("case_id", caseId).maybeSingle();
  const { error } = await w.supabase
    .from("case_final")
    .upsert({ case_id: caseId, office_id: w.ctx.officeId, ...patch, updated_at: new Date().toISOString() }, { onConflict: "case_id" });
  if (error) return fail(error.message);
  const gone = (["report_path", "bundle_path", "word_path"] as const)
    .filter((k) => k in patch && old?.[k] && old[k] !== patch[k])
    .map((k) => old![k] as string);
  if (gone.length) await w.supabase.storage.from("case-files").remove(gone);
  done(caseId);
  return { ok: true, text: "تم الحفظ" };
}

export async function finalUrl(path: string) {
  const ctx = await getCtx();
  if (!path.startsWith(`${ctx.officeId}/`)) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("case-files").createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}
