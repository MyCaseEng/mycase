import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCtx } from "@/lib/office";
import { getSettings } from "@/lib/settings";
import { QTPL_DEFAULT } from "@/lib/refs";
import { TEMPLATE_KINDS } from "@/lib/docs";
import { SRCS } from "@/lib/format";
import TemplateRow from "./template-row";
import { COUNTRIES, validCountry } from "@/lib/countries";

async function saveOffice(form: FormData) {
  "use server";
  const ctx = await getCtx();
  const supabase = await createClient();
  await supabase
    .from("offices")
    .update({
      name: String(form.get("name") || "").trim(),
      expert_name: String(form.get("expert") || "").trim() || null,
      address: String(form.get("address") || "").trim() || null,
      country: validCountry(form.get("country")),
    })
    .eq("id", ctx.officeId);
  revalidatePath("/", "layout");
}

async function saveWork(form: FormData) {
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
  await supabase.from("office_settings").upsert({ office_id: ctx.officeId, data, updated_at: new Date().toISOString() });
  await supabase.from("activity").insert({ office_id: ctx.officeId, action: "تعديل إعدادات المكتب" });
  revalidatePath("/", "layout");
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
      <form action={saveOffice} className="space-y-4 rounded-xl border border-line bg-white p-5">
        <h2 className="font-semibold">بيانات المكتب</h2>
        <label className="block">
          <span className="text-sm text-muted">اسم المكتب</span>
          <input name="name" defaultValue={office?.name ?? ""} disabled={!isAdmin} required className="mt-1 w-full rounded-lg border border-line px-3 py-2 disabled:bg-background" />
        </label>
        <label className="block">
          <span className="text-sm text-muted">اسم الخبير (للتوقيع في الخطابات والتقارير)</span>
          <input name="expert" defaultValue={office?.expert_name ?? ""} disabled={!isAdmin} className="mt-1 w-full rounded-lg border border-line px-3 py-2 disabled:bg-background" />
        </label>
        <label className="block">
          <span className="text-sm text-muted">الدولة (تظهر مع علمها في ترويسة المنصة)</span>
          <select name="country" defaultValue={office?.country ?? "QA"} disabled={!isAdmin} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 disabled:bg-background">
            {COUNTRIES.map(([c, n]) => (
              <option key={c} value={c}>{n}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-muted">عنوان المكتب (يُطبع في محضر المعاينة إذا كانت في مقر المكتب)</span>
          <input name="address" defaultValue={office?.address ?? ""} disabled={!isAdmin} className="mt-1 w-full rounded-lg border border-line px-3 py-2 disabled:bg-background" />
        </label>
        {isAdmin ? (
          <button className="rounded-lg bg-brand px-5 py-2 font-semibold text-white">حفظ</button>
        ) : (
          <p className="text-sm text-muted">يعدّل هذه البيانات مدير المكتب.</p>
        )}
      </form>
      <form action={saveWork} className="space-y-4 rounded-xl border border-line bg-white p-5">
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
        {isAdmin && <button className="rounded-lg bg-brand px-5 py-2 font-semibold text-white">حفظ</button>}
      </form>
      <section className="space-y-3 rounded-xl border border-line bg-white p-5">
        <h2 className="font-semibold">قوالب Word</h2>
        <p className="text-sm text-muted">
          ارفع قالب المكتب لكل نوع. القالب «العام» يُستعمل لكل الدعاوى، ويمكن رفع قالب بترويسة مختلفة لجهة تكليف معيّنة (مثل جمعية المهندسين) فيُستعمل لدعاويها بدل العام.
        </p>
        <div className="divide-y divide-line rounded-lg border border-line">
          {TEMPLATE_KINDS.map(([k, label]) => (
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
