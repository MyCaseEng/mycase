import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCtx } from "@/lib/office";
import { getSettings } from "@/lib/settings";
import { QTPL_DEFAULT } from "@/lib/refs";
import { FORM_KINDS } from "@/lib/forms";
import { SRCS } from "@/lib/format";
import TemplateRow from "./template-row";
import SaveForm from "@/components/save-form";
import { countryName, flagUrl, validCountry } from "@/lib/countries";
import { SpecialtyIcon, specialtyOf } from "@/lib/specialties";

async function saveOffice(_: unknown, form: FormData): Promise<{ ok: boolean; text: string }> {
  "use server";
  const ctx = await getCtx();
  const supabase = await createClient();
  const { error } = await supabase
    .from("offices")
    .update({
      name: String(form.get("name") || "").trim(),
      expert_name: String(form.get("expert") || "").trim() || null,
      address: String(form.get("address") || "").trim() || null,
      expert_reg: String(form.get("expert_reg") || "").trim() || null,
      phone: String(form.get("phone") || "").trim() || null,
      email: String(form.get("email") || "").trim() || null,
    })
    .eq("id", ctx.officeId);
  if (error) return { ok: false, text: "تعذّر الحفظ: " + error.message };
  revalidatePath("/", "layout"); // the office name is in the letterhead of every page
  return { ok: true, text: "تم الحفظ" };
}

async function saveWork(_: unknown, form: FormData): Promise<{ ok: boolean; text: string }> {
  "use server";
  const ctx = await getCtx();
  const supabase = await createClient();
  const { data: cur } = await supabase.from("office_settings").select("data").eq("office_id", ctx.officeId).maybeSingle();
  const names = form.getAll("tpl_name").map((v) => String(v).trim());
  const bodies = form.getAll("tpl_body").map((v) => String(v));
  const qTemplates: Record<string, string[]> = {};
  names.forEach((n, i) => {
    const qs = (bodies[i] ?? "").split("\n").map((q) => q.trim()).filter(Boolean);
    if (n && qs.length) qTemplates[n] = qs;
  });
  const data = {
    ...((cur?.data as object) ?? {}),
    refPrefix: String(form.get("refPrefix") || "").trim() || "م ع",
    defaultReplyDays: Math.max(1, Number(form.get("defaultReplyDays") || 5)),
    qTemplates,
  };
  const [{ error }] = await Promise.all([
    supabase.from("office_settings").upsert({ office_id: ctx.officeId, data, updated_at: new Date().toISOString() }),
    supabase.from("activity").insert({ office_id: ctx.officeId, action: "تعديل إعدادات المكتب" }),
  ]);
  if (error) return { ok: false, text: "تعذّر الحفظ: " + error.message };
  revalidatePath("/settings"); // only this page shows these values; other pages read them fresh when opened
  return { ok: true, text: "تم الحفظ" };
}

export default async function SettingsPage() {
  const ctx = await getCtx();
  const supabase = await createClient();
  const { data: office } = await supabase.from("offices").select("*").eq("id", ctx.officeId).single();
  const { data: wordTpls } = await supabase.from("templates").select("kind, assign_src, file_name, updated_at").eq("office_id", ctx.officeId);
  const isAdmin = ctx.role === "admin";
  const st = await getSettings(ctx.officeId);
  const tpls = Object.entries(Object.keys(st.qTemplates).length ? st.qTemplates : QTPL_DEFAULT);
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">الإعدادات</h1>
      <SaveForm action={saveOffice} canSave={isAdmin} className="space-y-4 rounded-xl border border-line bg-white p-5">
        <h2 className="font-semibold">بيانات المكتب</h2>
        <label className="block">
          <span className="text-sm text-muted">اسم المكتب</span>
          <input name="name" defaultValue={office?.name ?? ""} disabled={!isAdmin} required className="mt-1 w-full rounded-lg border border-line px-3 py-2 disabled:bg-background" />
        </label>
        <label className="block">
          <span className="text-sm text-muted">اسم الخبير (للتوقيع في الخطابات والتقارير)</span>
          <input name="expert" defaultValue={office?.expert_name ?? ""} disabled={!isAdmin} className="mt-1 w-full rounded-lg border border-line px-3 py-2 disabled:bg-background" />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm text-muted">رقم قيد الخبير</span>
            <input name="expert_reg" defaultValue={office?.expert_reg ?? ""} disabled={!isAdmin} className="mt-1 w-full rounded-lg border border-line px-3 py-2 disabled:bg-background" />
          </label>
          <label className="block">
            <span className="text-sm text-muted">هاتف المكتب</span>
            <input name="phone" dir="ltr" defaultValue={office?.phone ?? ""} disabled={!isAdmin} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-right disabled:bg-background" />
          </label>
          <label className="block">
            <span className="text-sm text-muted">بريد المكتب</span>
            <input name="email" type="email" dir="ltr" defaultValue={office?.email ?? ""} disabled={!isAdmin} className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-right disabled:bg-background" />
          </label>
        </div>
        <p className="-mt-2 text-xs text-muted">تُطبع هذه البيانات في ترويسة النماذج (الخطابات والمحاضر والتقرير).</p>
        {/* The country is chosen once when the office is created; it is shown here, not edited. */}
        <div>
          <span className="text-sm text-muted">الدولة (تُحدَّد مرة واحدة عند إنشاء المكتب)</span>
          <div className="mt-1 flex items-center gap-2 rounded-lg border border-line bg-background px-3 py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={flagUrl(validCountry(office?.country))} alt="" width={18} height={18} className="size-[18px] rounded-full" />
            {countryName(office?.country)}
          </div>
        </div>
        <div>
          <span className="text-sm text-muted">نوع وتخصص الخبرة (يُحدَّد مرة واحدة عند إنشاء المكتب)</span>
          <div className="mt-1 flex items-center gap-2 rounded-lg border border-line bg-background px-3 py-2">
            <span className="text-brand"><SpecialtyIcon code={office?.specialty} size={18} /></span>
            {specialtyOf(office?.specialty).name}
          </div>
        </div>
        <label className="block">
          <span className="text-sm text-muted">عنوان المكتب (يُطبع في الترويسة، وفي المحاضر إذا كان الموعد في مقر المكتب)</span>
          <input name="address" defaultValue={office?.address ?? ""} disabled={!isAdmin} className="mt-1 w-full rounded-lg border border-line px-3 py-2 disabled:bg-background" />
        </label>
        {!isAdmin && <p className="text-sm text-muted">يعدّل هذه البيانات مدير المكتب.</p>}
      </SaveForm>
      <SaveForm action={saveWork} canSave={isAdmin} className="space-y-4 rounded-xl border border-line bg-white p-5">
        <h2 className="font-semibold">الأرقام المرجعية والأسئلة</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm text-muted">بادئة الرقم المرجعي (مثال: م ع/007/س أ/26)</span>
            <input name="refPrefix" defaultValue={st.refPrefix} disabled={!isAdmin} className="mt-1 w-full rounded-lg border border-line px-3 py-2 disabled:bg-background" />
          </label>
          <label className="block">
            <span className="text-sm text-muted">مهلة الرد الافتراضية على الأسئلة (أيام)</span>
            <input name="defaultReplyDays" type="number" min={1} defaultValue={st.defaultReplyDays} disabled={!isAdmin} className="mt-1 w-full rounded-lg border border-line px-3 py-2 disabled:bg-background" />
          </label>
        </div>
        <div className="space-y-3">
          <span className="text-sm text-muted">قوالب الأسئلة (سؤال في كل سطر). لإضافة قالب جديد اكتب اسمه وأسئلته في الخانات الفارغة.</span>
          {[...tpls, ["", []] as [string, string[]]].map(([name, qs], i) => (
            <div key={i} className="space-y-1 rounded-lg border border-line p-3">
              <input name="tpl_name" defaultValue={name} placeholder="اسم القالب (مثل: مقاولات، إيجارات)" disabled={!isAdmin} className="w-full rounded-lg border border-line px-3 py-1.5 font-semibold disabled:bg-background" />
              <textarea name="tpl_body" rows={name ? 6 : 3} defaultValue={qs.join("\n")} disabled={!isAdmin} className="w-full rounded-lg border border-line px-3 py-2 text-sm leading-7 disabled:bg-background" />
            </div>
          ))}
        </div>
      </SaveForm>
      <section className="space-y-3 rounded-xl border border-line bg-white p-5">
        <h2 className="font-semibold">النماذج وقوالب Word</h2>
        <p className="text-sm leading-7 text-muted">
          تستعمل المنصة نماذجها القياسية تلقائياً، بترويسة مكتبك وبياناته. إن أردت صياغة أو ترويسة خاصة بمكتبك لنموذج معيّن، ارفع قالبك فيحل محل القياسي عندك. ويمكن رفع قالب لجهة تكليف معيّنة (مثل جمعية المهندسين) فيُستعمل لدعاويها فقط.
        </p>
        <div className="divide-y divide-line rounded-lg border border-line">
          {FORM_KINDS.map(([k, label]) => (
            <TemplateRow
              key={k}
              kind={k}
              label={label}
              items={(wordTpls ?? []).filter((x) => x.kind === k).map((x) => ({ src: x.assign_src, fileName: x.file_name, updatedAt: x.updated_at }))}
              srcs={SRCS.map(([v, l]) => [v, l])}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
