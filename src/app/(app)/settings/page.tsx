import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCtx } from "@/lib/office";

async function saveOffice(form: FormData) {
  "use server";
  const ctx = await getCtx();
  const supabase = await createClient();
  await supabase
    .from("offices")
    .update({ name: String(form.get("name") || "").trim(), expert_name: String(form.get("expert") || "").trim() || null })
    .eq("id", ctx.officeId);
  revalidatePath("/", "layout");
}

export default async function SettingsPage() {
  const ctx = await getCtx();
  const supabase = await createClient();
  const { data: office } = await supabase.from("offices").select("name, expert_name").eq("id", ctx.officeId).single();
  const isAdmin = ctx.role === "admin";
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
        {isAdmin ? (
          <button className="rounded-lg bg-brand px-5 py-2 font-semibold text-white">حفظ</button>
        ) : (
          <p className="text-sm text-muted">يعدّل هذه البيانات مدير المكتب.</p>
        )}
      </form>
      <div className="rounded-xl border border-dashed border-line bg-white p-5 text-sm text-muted">
        القوالب والترويسات وقوالب الأسئلة وقواعد التنبيهات تُضاف هنا في الخطوات 5 و6.
      </div>
    </div>
  );
}
