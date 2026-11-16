"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCtx } from "@/lib/office";

export async function uploadTemplate(kind: string, src: string | null, form: FormData): Promise<string> {
  const ctx = await getCtx();
  if (ctx.role !== "admin") return "يرفع القوالب مدير المكتب فقط.";
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return "اختر ملف Word.";
  if (!/\.docx$/i.test(file.name)) return "الملف يجب أن يكون بصيغة .docx";
  if (file.size > 4 * 1024 * 1024) return "حجم الملف أكبر من 4 ميغابايت.";
  const content = Buffer.from(await file.arrayBuffer()).toString("base64");
  const supabase = await createClient();
  const q = supabase.from("templates").select("id").eq("office_id", ctx.officeId).eq("kind", kind);
  const { data: cur } = await (src ? q.eq("assign_src", src) : q.is("assign_src", null)).maybeSingle();
  const row = { content, file_name: file.name, updated_at: new Date().toISOString() };
  const { error } = cur
    ? await supabase.from("templates").update(row).eq("id", cur.id)
    : await supabase.from("templates").insert({ ...row, office_id: ctx.officeId, kind, assign_src: src });
  if (error) return error.message;
  await supabase.from("activity").insert({ office_id: ctx.officeId, action: "رفع قالب Word", detail: { name: `${kind}${src ? " · " + src : ""} · ${file.name}` } });
  revalidatePath("/settings");
  return "";
}

export async function deleteTemplate(kind: string, src: string | null) {
  const ctx = await getCtx();
  const supabase = await createClient();
  const q = supabase.from("templates").delete().eq("office_id", ctx.officeId).eq("kind", kind);
  await (src ? q.eq("assign_src", src) : q.is("assign_src", null));
  revalidatePath("/settings");
}
