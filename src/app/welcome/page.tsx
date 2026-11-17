import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BRAND } from "@/lib/brand";
import SubmitButton from "@/components/submit-button";
import { COUNTRIES, DEFAULT_COUNTRY, validCountry } from "@/lib/countries";
import { SPECIALTIES, DEFAULT_SPECIALTY, validSpecialty } from "@/lib/specialties";

// First sign-in with no office: create one (you become its admin) or wait for an invitation.
async function createOffice(formData: FormData) {
  "use server";
  const name = String(formData.get("name") || "").trim();
  const display = String(formData.get("display") || "").trim();
  if (!name || !display) return;
  const supabase = await createClient();
  // one office per new account: if this person already belongs to an office (e.g. the form was sent twice), go to it
  const { data: cl } = await supabase.auth.getClaims();
  const { data: already } = await supabase.from("members").select("office_id").eq("user_id", cl?.claims?.sub ?? "").limit(1);
  if (already?.length) redirect("/");
  const { data: officeId, error } = await supabase.rpc("create_office", { p_name: name, p_display_name: display });
  if (error) throw new Error(error.message);
  await supabase.from("offices").update({
      country: validCountry(formData.get("country")),
      specialty: validSpecialty(formData.get("specialty")),
      expert_reg: String(formData.get("expert_reg") || "").trim().slice(0, 40) || null,
    }).eq("id", officeId);
  redirect("/");
}

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-muted">جارٍ التحميل…</div>}>
      <Welcome />
    </Suspense>
  );
}

async function Welcome() {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/login");
  const { data: joined } = await supabase.rpc("accept_invitations");
  if (joined && joined > 0) redirect("/");
  // the platform owner never has to create an office
  const { data: owner } = await supabase.rpc("is_platform_admin");
  if (owner) redirect("/platform");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-line bg-white p-7 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-brand">أهلاً بك في {BRAND.name}</h1>
          <p className="mt-1 text-sm text-muted" dir="auto">
            {u.user.email}
          </p>
        </div>
        <div className="rounded-xl bg-background p-4 text-sm leading-7">
          <b>هل دعاك مكتبك؟</b> اطلب من مدير المكتب أن يضيف بريدك أعلاه في صفحة الفريق، ثم أعد فتح المنصة.
        </div>
        <form action={createOffice} className="space-y-3">
          <b className="text-sm">أو أنشئ مكتباً جديداً وتصبح مديره:</b>
          <input
            name="name"
            required
            placeholder="اسم المكتب"
            className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand"
          />
          <label className="block text-sm text-muted">
            دولة المكتب
            <select
              name="country"
              defaultValue={DEFAULT_COUNTRY}
              className="mt-1 w-full rounded-lg border border-line bg-white text-foreground px-3 py-2 outline-none focus:border-brand"
            >
              {COUNTRIES.map(([c, n]) => (
                <option key={c} value={c}>{n}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-muted">
            نوع وتخصص الخبرة
            <select
              name="specialty"
              defaultValue={DEFAULT_SPECIALTY}
              className="mt-1 w-full rounded-lg border border-line bg-white text-foreground px-3 py-2 outline-none focus:border-brand"
            >
              {SPECIALTIES.map((sp) => (
                <option key={sp.code} value={sp.code}>{sp.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-muted">
            رقم قيد الخبير
            <input
              name="expert_reg"
              dir="ltr"
              maxLength={40}
              placeholder="كما في شهادة القيد لدى الجهة المختصة"
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-right text-foreground outline-none focus:border-brand"
            />
            <span className="mt-1 block text-xs">يُطبع في ترويسة النماذج، ويدخل في الرقم المرجعي لمستنداتك. يمكن تعديله لاحقاً من الإعدادات.</span>
          </label>
          <input
            name="display"
            required
            placeholder="اسمك كما يظهر للفريق"
            className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand"
          />
          <SubmitButton pendingText="جارٍ إنشاء المكتب…" className="w-full rounded-lg bg-ink py-2.5 font-semibold text-white hover:bg-ink-hover">
            إنشاء المكتب
          </SubmitButton>
        </form>
        <form action={signOut}>
          <button className="text-xs text-muted hover:text-red-700">تسجيل الخروج</button>
        </form>
      </div>
    </main>
  );
}
