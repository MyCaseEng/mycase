import "server-only";
// A sample case added to every new office, so the expert can explore the platform with data that looks real.
// Everything in it is invented. No reference numbers are issued for it (the office register stays clean).
import type { SupabaseClient } from "@supabase/supabase-js";

const day = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export async function createSampleCase(supabase: SupabaseClient, officeId: string, userId: string) {
  const year = new Date().getUTCFullYear();
  const { data: c, error } = await supabase
    .from("cases")
    .insert({
      office_id: officeId,
      created_by: userId,
      is_sample: true,
      case_no: `100 - ${year}`,
      case_type: "ابتدائي مدني كلي",
      authority: "المحكمة الابتدائية",
      mission:
        "الاطلاع على أوراق الدعوى ومستنداتها والانتقال إلى موقع المشروع ومعاينته، وبيان الأعمال المنفّذة ونسبة إنجازها ومطابقتها للعقد والمخططات، وتحديد سبب التأخير والمسؤول عنه، وتصفية الحساب بين الطرفين.",
      received: day(-20),
      prelim_date: day(-24),
      deadline: day(40),
      deposit_ordered: 15000,
      claim_value: 1250000,
      project_value: 4800000,
    })
    .select("id")
    .single();
  if (error || !c) return; // the sample is a convenience: never block the office creation
  const id = c.id as string;
  const { data: ps } = await supabase
    .from("parties")
    .insert([
      { case_id: id, office_id: officeId, side: 1, role: "المدعية", name: "شركة النموذج للمقاولات (بيانات تجريبية)", lawyer: "مكتب المحامي سالم (تجريبي)", sort: 1 },
      { case_id: id, office_id: officeId, side: 2, role: "المدعى عليها", name: "شركة المثال للتطوير العقاري (بيانات تجريبية)", sort: 2 },
    ])
    .select("id, side");
  const p1 = ps?.find((p) => p.side === 1)?.id ?? null;
  const p2 = ps?.find((p) => p.side === 2)?.id ?? null;
  await Promise.all([
    supabase.from("events").insert([
      { case_id: id, office_id: officeId, type: "جلسة", date: day(25) },
      { case_id: id, office_id: officeId, type: "اجتماع", date: day(2), time: "10:00", place: "مقر المكتب" },
      { case_id: id, office_id: officeId, type: "معاينة", date: day(6), time: "09:00", place: "موقع المشروع" },
    ]),
    supabase.from("question_letters").insert([
      {
        case_id: id, office_id: officeId, party_id: p1, letter_date: day(-15), days: 7, due: day(-8),
        questions: ["تقديم نسخة من العقد وملاحقه", "تقديم المستخلصات المعتمدة", "بيان الأعمال المتبقية"],
        sent_at: new Date(Date.now() - 15 * 86400000).toISOString(), reply_type: "full", reply_date: day(-9),
      },
      {
        case_id: id, office_id: officeId, party_id: p2, letter_date: day(-15), days: 7, due: day(-8),
        questions: ["تقديم المراسلات الخاصة بالتأخير", "تقديم الإنذارات الموجهة للمقاول"],
        sent_at: new Date(Date.now() - 15 * 86400000).toISOString(),
      },
    ]),
    supabase.from("case_payments").insert({ case_id: id, office_id: officeId, kind: "deposit", payer_name: "المدعية", amount: 15000, paid_on: day(-18), note: "بيانات تجريبية" }),
    supabase.from("notes").insert({ case_id: id, office_id: officeId, body: "هذه دعوى نموذجية لتتعرّف على المنصة: جرّب فتح الأسئلة وتسجيل الرد، وتوليد المحاضر والخطابات. يمكنك حذفها متى شئت من «إجراءات الدعوى»." }),
    supabase.from("case_team").insert({ case_id: id, office_id: officeId, user_id: userId, duty: "executor" }),
  ]);
}
