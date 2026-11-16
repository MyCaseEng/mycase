"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCtx } from "@/lib/office";
import { caseRef, normCaseNo, normCaseType, roleSide, normRole, todayStr } from "@/lib/format";

export type Res = { ok: boolean; text: string } | null;

const s = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").trim();
  return v === "" ? null : v;
};
const n = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? "").replace(/[^\d.]/g, "");
  return v === "" ? null : Number(v);
};
const AR: Record<string, string> = { "42501": "لا تملك صلاحية هذا الإجراء." };
const err = (e: { code?: string; message: string }): Res => ({ ok: false, text: AR[e.code ?? ""] || e.message });

async function log(action: string, caseId: string | null, label: string | null, detail?: Record<string, unknown>) {
  const ctx = await getCtx();
  const supabase = await createClient();
  await supabase.from("activity").insert({ office_id: ctx.officeId, action, case_id: caseId, case_label: label, detail: detail ?? null });
}

function caseFields(f: FormData) {
  const src = s(f, "assign_src");
  return {
    case_no: s(f, "case_no") ? normCaseNo(s(f, "case_no")) : null,
    case_type: s(f, "case_type") ? normCaseType(s(f, "case_type")) : null,
    category: s(f, "category") ?? "محكمة",
    authority: s(f, "authority"),
    assign_src: src === "auto" ? null : src,
    circuit: s(f, "circuit"),
    judge: s(f, "judge"),
    secretary: s(f, "secretary"),
    mission: s(f, "mission"),
    received: s(f, "received"),
    prelim_date: s(f, "prelim_date"),
    deadline: s(f, "deadline"),
    due_note: s(f, "due_note"),
    deposit_ordered: n(f, "deposit_ordered"),
    claim_value: n(f, "claim_value"),
    project_value: n(f, "project_value"),
    supplementary: f.get("supplementary") === "on",
  };
}

export async function createCase(_: Res, f: FormData): Promise<Res> {
  const ctx = await getCtx();
  const supabase = await createClient();
  const fields = caseFields(f);
  if (!fields.received) fields.received = todayStr();
  const p1 = s(f, "p1_name"), p2 = s(f, "p2_name");
  if (!fields.case_no && !p1 && !p2) return { ok: false, text: "أدخل رقم الدعوى أو طرفاً واحداً على الأقل." };
  const { data, error } = await supabase.from("cases").insert({ ...fields, office_id: ctx.officeId, created_by: ctx.userId }).select("id").single();
  if (error) return err(error);
  const parties = [
    p1 && { role: s(f, "p1_role") ?? "المدعي", name: p1 },
    p2 && { role: s(f, "p2_role") ?? "المدعى عليه", name: p2 },
  ].filter(Boolean) as { role: string; name: string }[];
  if (parties.length)
    await supabase.from("parties").insert(
      parties.map((p, i) => ({ ...p, role: normRole(p.role), side: roleSide(p.role), case_id: data.id, office_id: ctx.officeId, sort: i }))
    );
  await supabase.from("case_team").insert({ case_id: data.id, office_id: ctx.officeId, user_id: ctx.userId, duty: "executor" });
  await log("إنشاء دعوى", data.id, caseRef(fields) || parties.map((p) => p.name).join(" ضد "));
  revalidatePath("/cases");
  redirect(`/cases/${data.id}`);
}

export async function updateCase(id: string, _: Res, f: FormData): Promise<Res> {
  const ctx = await getCtx();
  const supabase = await createClient();
  const fields = caseFields(f);
  const { error } = await supabase.from("cases").update(fields).eq("id", id).eq("office_id", ctx.officeId);
  if (error) return err(error);
  await log("تعديل بيانات الدعوى", id, caseRef(fields));
  revalidatePath(`/cases/${id}`);
  revalidatePath("/cases");
  return { ok: true, text: "حُفظت البيانات." };
}

export async function saveParty(caseId: string, partyId: string | null, _: Res, f: FormData): Promise<Res> {
  const ctx = await getCtx();
  const supabase = await createClient();
  const role = normRole(s(f, "role") ?? "طرف آخر");
  const row = {
    role,
    side: roleSide(role),
    name: s(f, "name") ?? "",
    kind: s(f, "kind"),
    phone: s(f, "phone"),
    email: s(f, "email"),
    lawyer: s(f, "lawyer"),
    lawyer_phone: s(f, "lawyer_phone"),
    lawyer_email: s(f, "lawyer_email"),
  };
  if (!row.name) return { ok: false, text: "اكتب اسم الطرف." };
  const q = partyId
    ? supabase.from("parties").update(row).eq("id", partyId).eq("office_id", ctx.officeId)
    : supabase.from("parties").insert({ ...row, case_id: caseId, office_id: ctx.officeId, sort: Date.now() % 100000 });
  const { error } = await q;
  if (error) return err(error);
  await log(partyId ? "تعديل طرف" : "إضافة طرف", caseId, null, { name: row.name });
  revalidatePath(`/cases/${caseId}`);
  return { ok: true, text: "حُفظ." };
}

export async function deleteParty(caseId: string, partyId: string) {
  const ctx = await getCtx();
  const supabase = await createClient();
  await supabase.from("parties").delete().eq("id", partyId).eq("office_id", ctx.officeId);
  await log("حذف طرف", caseId, null);
  revalidatePath(`/cases/${caseId}`);
}

export async function saveEvent(caseId: string, eventId: string | null, _: Res, f: FormData): Promise<Res> {
  const ctx = await getCtx();
  const supabase = await createClient();
  const row = {
    type: s(f, "type") ?? "اجتماع",
    date: s(f, "date"),
    time: s(f, "time"),
    place: s(f, "place"),
    invited: s(f, "invited") ?? "all",
    note: s(f, "note"),
  };
  if (!row.date) return { ok: false, text: "اختر التاريخ." };
  const q = eventId
    ? supabase.from("events").update(row).eq("id", eventId).eq("office_id", ctx.officeId)
    : supabase.from("events").insert({ ...row, case_id: caseId, office_id: ctx.officeId });
  const { error } = await q;
  if (error) return err(error);
  await log(eventId ? `تعديل ${row.type}` : `إضافة ${row.type}`, caseId, null, { date: row.date });
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  return { ok: true, text: "حُفظ." };
}

export async function deleteEvent(caseId: string, eventId: string) {
  const ctx = await getCtx();
  const supabase = await createClient();
  await supabase.from("events").delete().eq("id", eventId).eq("office_id", ctx.officeId);
  await log("حذف موعد", caseId, null);
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
}

export async function setTeam(caseId: string, executors: string[], coordinators: string[]): Promise<Res> {
  const ctx = await getCtx();
  const supabase = await createClient();
  const { error } = await supabase.from("case_team").delete().eq("case_id", caseId).eq("office_id", ctx.officeId);
  if (error) return err(error);
  const rows = [
    ...executors.map((u) => ({ case_id: caseId, office_id: ctx.officeId, user_id: u, duty: "executor" })),
    ...coordinators.map((u) => ({ case_id: caseId, office_id: ctx.officeId, user_id: u, duty: "coordinator" })),
  ];
  if (rows.length) {
    const { error: e2 } = await supabase.from("case_team").insert(rows);
    if (e2) return err(e2);
  }
  await log("تعديل فريق الدعوى", caseId, null);
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  return { ok: true, text: "حُفظ الفريق." };
}

export async function addNote(caseId: string, _: Res, f: FormData): Promise<Res> {
  const ctx = await getCtx();
  const body = s(f, "body");
  if (!body) return null;
  const supabase = await createClient();
  const { error } = await supabase.from("notes").insert({ case_id: caseId, office_id: ctx.officeId, body });
  if (error) return err(error);
  revalidatePath(`/cases/${caseId}`);
  return { ok: true, text: "" };
}

export async function deleteNote(caseId: string, noteId: string) {
  const ctx = await getCtx();
  const supabase = await createClient();
  await supabase.from("notes").delete().eq("id", noteId).eq("office_id", ctx.officeId);
  revalidatePath(`/cases/${caseId}`);
}

export async function setDelivered(caseId: string, date: string | null): Promise<Res> {
  const ctx = await getCtx();
  const supabase = await createClient();
  const { error } = await supabase
    .from("cases")
    .update({ report_date: date, status: date ? "تم التسليم" : "فعالة" })
    .eq("id", caseId)
    .eq("office_id", ctx.officeId);
  if (error) return err(error);
  await log(date ? "تسليم التقرير" : "إلغاء التسليم", caseId, null, { date });
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  return { ok: true, text: "" };
}

export async function trashCase(caseId: string) {
  const ctx = await getCtx();
  const supabase = await createClient();
  await supabase.from("cases").update({ deleted_at: new Date().toISOString() }).eq("id", caseId).eq("office_id", ctx.officeId);
  await log("حذف دعوى", caseId, null);
  revalidatePath("/cases");
  redirect("/cases");
}

/* ---------------- import from PDF ---------------- */
type ImpParty = { role: string; name: string; kind?: string; phone?: string; email?: string; lawyer?: string; lawyer_phone?: string; lawyer_email?: string };
type ImpSession = { date: string; note: string };

// New case from a reviewed import: case fields come from the form, parties and hearings as JSON.
export async function createImportedCase(_: Res, f: FormData): Promise<Res> {
  const ctx = await getCtx();
  const supabase = await createClient();
  const fields = caseFields(f);
  if (!fields.received) fields.received = todayStr();
  const parties = JSON.parse(String(f.get("parties_json") || "[]")) as ImpParty[];
  const sessions = JSON.parse(String(f.get("sessions_json") || "[]")) as ImpSession[];
  const sourceFile = s(f, "source_file");
  if (!fields.case_no && !parties.length) return { ok: false, text: "أدخل رقم الدعوى أو طرفاً واحداً على الأقل." };
  const { data, error } = await supabase
    .from("cases")
    .insert({ ...fields, office_id: ctx.officeId, created_by: ctx.userId, source_file: sourceFile })
    .select("id")
    .single();
  if (error) return err(error);
  if (parties.length)
    await supabase.from("parties").insert(
      parties.filter((p) => p.name?.trim()).map((p, i) => ({
        case_id: data.id, office_id: ctx.officeId, sort: i, role: normRole(p.role || "طرف آخر"), side: roleSide(p.role || ""),
        name: p.name.trim(), kind: p.kind || null, phone: p.phone || null, email: p.email || null,
        lawyer: p.lawyer || null, lawyer_phone: p.lawyer_phone || null, lawyer_email: p.lawyer_email || null,
      }))
    );
  if (sessions.length)
    await supabase.from("events").insert(sessions.filter((x) => x.date).map((x) => ({ case_id: data.id, office_id: ctx.officeId, type: "جلسة", date: x.date, note: x.note || null })));
  await supabase.from("case_team").insert({ case_id: data.id, office_id: ctx.officeId, user_id: ctx.userId, duty: "executor" });
  await log("إنشاء دعوى من PDF", data.id, caseRef(fields) || parties.map((p) => p.name).slice(0, 2).join(" ضد "));
  revalidatePath("/cases");
  redirect(`/cases/${data.id}`);
}

// Update an existing case from a new PDF (e.g. the preliminary judgment arrives after the statement of claim):
// only empty fields are filled, new parties and hearings are added, nothing is overwritten.
export async function applyImportToCase(
  caseId: string,
  patch: Record<string, string | number | boolean | null>,
  parties: ImpParty[],
  sessions: ImpSession[],
  sourceFile: string | null
): Promise<Res> {
  const ctx = await getCtx();
  const supabase = await createClient();
  const allowed = ["case_no", "case_type", "authority", "circuit", "judge", "secretary", "mission", "received", "prelim_date", "deadline", "due_note", "deposit_ordered", "claim_value", "project_value"];
  const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
  if (sourceFile) clean.source_file = sourceFile;
  if (Object.keys(clean).length) {
    const { error } = await supabase.from("cases").update(clean).eq("id", caseId).eq("office_id", ctx.officeId);
    if (error) return err(error);
  }
  if (parties.length)
    await supabase.from("parties").insert(
      parties.map((p, i) => ({
        case_id: caseId, office_id: ctx.officeId, sort: 100 + i, role: normRole(p.role || "طرف آخر"), side: roleSide(p.role || ""),
        name: p.name, kind: p.kind || null, phone: p.phone || null, email: p.email || null,
        lawyer: p.lawyer || null, lawyer_phone: p.lawyer_phone || null, lawyer_email: p.lawyer_email || null,
      }))
    );
  if (sessions.length)
    await supabase.from("events").insert(sessions.map((x) => ({ case_id: caseId, office_id: ctx.officeId, type: "جلسة", date: x.date, note: x.note || null })));
  await log("تحديث الدعوى من PDF", caseId, null, { name: `${Object.keys(clean).length} حقل · ${parties.length} طرف · ${sessions.length} جلسة` });
  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/cases");
  return { ok: true, text: "حُدّثت الدعوى." };
}

export async function sourceFileUrl(caseId: string): Promise<string | null> {
  const ctx = await getCtx();
  const supabase = await createClient();
  const { data: c } = await supabase.from("cases").select("source_file").eq("id", caseId).eq("office_id", ctx.officeId).single();
  if (!c?.source_file) return null;
  const { data } = await supabase.storage.from("case-files").createSignedUrl(c.source_file, 300);
  return data?.signedUrl ?? null;
}
