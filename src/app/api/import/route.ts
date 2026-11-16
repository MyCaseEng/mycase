import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractCase } from "@/lib/extract";

// A long bundled PDF can take Claude a minute or two to read.
export const maxDuration = 300;

// POST { path } — the PDF was already uploaded by the browser to storage at <office_id>/…; read it and extract.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return NextResponse.json({ error: "سجّل الدخول أولاً." }, { status: 401 });
  const { path } = (await req.json().catch(() => ({}))) as { path?: string };
  const officeId = path?.split("/")[0];
  if (!path || !officeId) return NextResponse.json({ error: "مسار الملف غير صحيح." }, { status: 400 });
  // the storage policies already restrict reads to members of that office; check the role for writing too
  const { data: m } = await supabase.from("members").select("role").eq("office_id", officeId).eq("user_id", u.user.id).eq("is_active", true).maybeSingle();
  if (!m || m.role === "viewer") return NextResponse.json({ error: "لا تملك صلاحية الاستيراد." }, { status: 403 });

  const { data: file, error } = await supabase.storage.from("case-files").download(path);
  if (error || !file) return NextResponse.json({ error: "تعذّر قراءة الملف من التخزين." }, { status: 404 });
  try {
    const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const ex = await extractCase(b64);
    await supabase.from("activity").insert({ office_id: officeId, action: "استيراد ملف PDF", detail: { name: `${path.split("/").pop()} · قُرئت ${ex.read} من ${ex.pages} صفحة`, ref: ex.case_no } });
    return NextResponse.json({ ok: true, ex });
  } catch (e) {
    const msg = (e as Error).message || "";
    const friendly = /credit|billing|balance/i.test(msg)
      ? "رصيد Claude API غير كافٍ. أضف رصيداً من console.anthropic.com."
      : /api.?key|authentication|401/i.test(msg)
        ? "مفتاح Claude API غير صحيح. راجع ANTHROPIC_API_KEY في Vercel."
        : /pages|too large|413|size/i.test(msg)
          ? "الملف أكبر من الحد المسموح (عدد الصفحات أو الحجم). قسّمه أو ارفع الجزء الذي فيه الحكم."
          : msg;
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
