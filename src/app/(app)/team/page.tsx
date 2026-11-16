import { createClient } from "@/lib/supabase/server";
import { getCtx, ROLE_LABEL, type Role } from "@/lib/office";
import { InviteForm, MemberControls, CancelInvite } from "./forms";

export default async function TeamPage() {
  const ctx = await getCtx();
  const supabase = await createClient();
  const isAdmin = ctx.role === "admin";
  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase.from("members").select("user_id, role, display_name, is_active").eq("office_id", ctx.officeId).order("created_at"),
    isAdmin
      ? supabase.from("invitations").select("id, email, display_name, role").eq("office_id", ctx.officeId).is("accepted_at", null)
      : Promise.resolve({ data: [] as { id: string; email: string; display_name: string; role: Role }[] }),
  ]);

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
                  {ROLE_LABEL[m.role as Role]}
                  {m.user_id === ctx.userId ? " · أنت" : ""}
                  {m.is_active ? "" : " · موقوف"}
                </div>
              </div>
              {isAdmin && m.user_id !== ctx.userId && (
                <MemberControls userId={m.user_id} role={m.role as Role} active={m.is_active} />
              )}
            </li>
          ))}
        </ul>
        <p className="px-5 pb-4 text-xs text-muted">حِمل كل عضو من الدعاوى يظهر هنا بعد بناء الدعاوى في الخطوة 4.</p>
      </section>

      {isAdmin && (
        <section className="rounded-xl border border-line bg-white p-5">
          <h2 className="font-semibold">دعوة زميل</h2>
          <p className="mt-1 text-sm text-muted">
            اكتب بريده، ثم يفتح المنصة ويختار «إنشاء حساب جديد» بالبريد نفسه، فينضم إلى المكتب تلقائياً.
          </p>
          <InviteForm />
          {(invites ?? []).length > 0 && (
            <ul className="mt-5 divide-y divide-line rounded-lg border border-line">
              {(invites ?? []).map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <span className="flex-1">
                    {i.display_name} · <span dir="ltr">{i.email}</span> · {ROLE_LABEL[i.role as Role]}
                  </span>
                  <span className="text-xs text-muted">بانتظار التسجيل</span>
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
