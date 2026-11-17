import { createClient } from "@/lib/supabase/server";
import { getCtx, ROLE_LABEL, type Role } from "@/lib/office";
import { StaffForm, MemberControls, CancelInvite, ResetPassword } from "./forms";
import { officeLoginCode } from "@/lib/staff";

export default async function TeamPage() {
  const ctx = await getCtx();
  const supabase = await createClient();
  const isAdmin = ctx.role === "admin";
  const [{ data: members }, { data: invites }, { data: office }] = await Promise.all([
    supabase.from("members").select("*").eq("office_id", ctx.officeId).order("created_at"),
    isAdmin
      ? supabase.from("invitations").select("id, email, display_name, role").eq("office_id", ctx.officeId).is("accepted_at", null)
      : Promise.resolve({ data: [] as { id: string; email: string; display_name: string; role: Role }[] }),
    supabase.from("offices").select("*").eq("id", ctx.officeId).single(),
  ]);
  const code: string = office?.login_code || officeLoginCode(office?.country, office?.expert_reg);

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">الفريق والحِمل</h1>

      <section className="rounded-xl border border-line bg-white">
        <h2 className="border-b border-line px-5 py-3 font-semibold">أعضاء المكتب</h2>
        <ul>
          {(members ?? []).map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3 last:border-0">
              <div className="min-w-40 flex-1">
                <div className={`font-semibold ${m.is_active ? "" : "text-muted line-through"}`}>{m.display_name}</div>
                <div className="text-xs text-muted">
                  {m.login && (
                    <>
                      <span dir="ltr" className="font-mono text-ink">{m.login}</span> ·{" "}
                    </>
                  )}
                  {ROLE_LABEL[m.role as Role]}
                  {m.user_id === ctx.userId ? " · أنت" : ""}
                  {m.is_active ? "" : " · موقوف"}
                </div>
              </div>
              {isAdmin && m.user_id !== ctx.userId && (
                <MemberControls userId={m.user_id} role={m.role as Role} active={m.is_active} />
              )}
              {isAdmin && m.user_id !== ctx.userId && m.login && m.is_active && <ResetPassword userId={m.user_id} />}
            </li>
          ))}
        </ul>
        <p className="px-5 pb-4 text-xs text-muted">حِمل كل عضو من الدعاوى يظهر هنا بعد بناء الدعاوى في الخطوة 4.</p>
      </section>

      {isAdmin && (
        <section className="rounded-xl border border-line bg-white p-5">
          <h2 className="font-semibold">إضافة عضو إلى الفريق</h2>
          <p className="mt-1 text-sm leading-7 text-muted">
            تُنشئ أنت حساب الموظف: اكتب اسمه واسم دخول قصيرًا بالإنجليزية، فيصبح معرّفه مثل{" "}
            <span dir="ltr" className="font-mono text-ink">ahmed@{code || "qat123"}</span>. تظهر لك كلمة مرور مؤقتة تعطيها له، ويغيّرها
            هو عند أول دخول. لا يحتاج الموظف بريدًا إلكترونيًا.
          </p>
          {code ? (
            <StaffForm code={code} />
          ) : (
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              أدخل رقم قيد الخبير من «الإعدادات» أولًا، فمنه ومن رمز دولتك يتكوّن رمز مكتبك في معرّفات الفريق.
            </p>
          )}
          {(invites ?? []).length > 0 && (
            <ul className="mt-5 divide-y divide-line rounded-lg border border-line">
              {(invites ?? []).map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <span className="flex-1">
                    {i.display_name} · <span dir="ltr">{i.email}</span> · {ROLE_LABEL[i.role as Role]}
                  </span>
                  <span className="text-xs text-muted">دعوة سابقة بالبريد · بانتظار التسجيل</span>
                  <CancelInvite id={i.id} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
