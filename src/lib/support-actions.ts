"use server";
// Help and support: a member writes to the platform owner (problem, suggestion, question) and later reads the reply.
import { createClient } from "@/lib/supabase/server";

export type Ticket = { id: string; kind: string; subject: string; body: string; status: string; reply: string | null; replied_at: string | null; created_at: string };

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
  const { error } = await supabase.from("support_tickets").insert({ office_id: m.office_id, kind, subject, body, page: String(f.get("page") ?? "").slice(0, 200) || null });
  if (error) return { ok: false, text: "تعذّر الإرسال: " + error.message };
  return { ok: true, text: "وصلت رسالتك إلى إدارة المنصة، وسيظهر الرد هنا." };
}

export async function myTickets(): Promise<Ticket[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("support_tickets")
    .select("id, kind, subject, body, status, reply, replied_at, created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  return (data ?? []) as Ticket[];
}
