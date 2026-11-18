import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BRAND } from "@/lib/brand";
import { OfficeForm, AutoSetup } from "./form";
import { isStaffEmail } from "@/lib/staff";

// First sign-in with no office: the office is created from the sign-up details, or from the form here.
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
  // team accounts belong to the office that made them; they never create an office
  if (isStaffEmail(u.user.email)) redirect("/suspended");
  const { data: joined } = await supabase.rpc("accept_invitations");
  if (joined && joined > 0) redirect("/");
  // the platform owner never has to create an office
  const { data: owner } = await supabase.rpc("is_platform_admin");
  if (owner) redirect("/platform");
  // a member already (e.g. the office was just created): go in
  const { data: mine } = await supabase.from("members").select("office_id").eq("user_id", u.user.id).limit(1);
  if (mine?.length) redirect("/");
  // details given in the one-step sign-up
  const o = (u.user.user_metadata as { office?: Record<string, unknown> } | undefined)?.office;
  const pending = o ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v ?? "")])) : null;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-line bg-white p-7 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-brand">أهلاً بك في {BRAND.name}</h1>
          <p className="mt-1 text-sm text-muted" dir="auto">
            {u.user.email}
          </p>
        </div>
        {pending ? (
          <AutoSetup v={pending} />
        ) : (
          <>
            <p className="text-sm text-muted">أكمل بيانات مكتبك لتبدأ، وتصبح مدير المكتب.</p>
            <OfficeForm />
          </>
        )}
        <form action={signOut}>
          <button className="text-xs text-muted hover:text-red-700">تسجيل الخروج</button>
        </form>
      </div>
    </main>
  );
}
