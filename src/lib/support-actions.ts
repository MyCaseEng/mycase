"use server";
// Help and support: a member writes to the platform owner (problem, suggestion, question) and later reads the reply.
import { createClient } from "@/lib/supabase/server";

export type Ticket = { id: string; kind: string; subject: string; body: string; status: string; reply: string | null; replied_at: string | null; created_at: string; files: string[] };
export type Att = { name: string; url: string; image: boolean };

// "path::name" entries -> short-lived download links (the database decides who may read them)
export async function signFiles(entries: string[]): Promise<Att[]> {
  if (!entries.length) return [];
  const supabase = await createClient();
  const parts = entries.map((e) => {
    const [path, ...n] = e.split("::");
    return { path, name: n.join("::") || path.split("/").pop()! };
  });
  const { data } = await supabase.storage.from("support-files").createSignedUrls(parts.map((p) => p.path), 60 * 60);
  return parts.flatMap((p, i) => (data?.[i]?.signedUrl ? [{ name: p.name, url: data[i].signedUrl, image: /\.(png|jpe?g|webp|gif)$/i.test(p.path) }] : []));
}

export async function sendTicket(_: unknown, f: FormData): Promise<{ ok: boolean; text: string }> {
  const supabase = await createClient();
  const { data: cl } = await supabase.auth.getClaims();
  const uid = cl?.claims?.sub;
  if (!uid) return { ok: false, text: "سجّل الدخول أولاً." };
  const { data: m } = await supabase.from("members").select("office_id").eq("user_id", uid).order("created_at").limit(1).maybeSingle();
  if (!m) return { ok: false, text: "لا يوجد مكتب مرتبط بحسابك." };
  const subject = String(f.get("subject") ?? "").trim().slice(0, 200);
  const body = String(f.get("body") ?? "").trim().slice(0, 5000);
  const kind = ["problem", "suggestion", "question"].includes(String(f.get("kind"))) ? String(f.get("kind")) : "problem";
  if (!subject || !body) return { ok: false, text: "اكتب العنوان والتفاصيل." };
  // files were uploaded by the browser into the sender's own folder; keep only entries in that folder
  const files = f
    .getAll("file")
    .map(String)
    .filter((e) => e.startsWith(uid + "/"))
    .slice(0, 5);
  const { error } = await supabase
    .from("support_tickets")
    .insert({ office_id: m.office_id, kind, subject, body, files, page: String(f.get("page") ?? "").slice(0, 200) || null });
  if (error) return { ok: false, text: "تعذّر الإرسال: " + error.message };
  return { ok: true, text: "وصلت رسالتك إلى إدارة المنصة، وسيظهر الرد هنا." };
}

export async function myTickets(): Promise<(Ticket & { atts: Att[] })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("support_tickets")
    .select("id, kind, subject, body, status, reply, replied_at, created_at, files")
    .order("created_at", { ascending: false })
    .limit(30);
  return Promise.all(((data ?? []) as Ticket[]).map(async (t) => ({ ...t, atts: await signFiles(t.files ?? []) })));
}
