import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BRAND } from "@/lib/brand";
import { myTickets } from "@/lib/support-actions";
import { SupportForm, TicketList } from "@/components/support";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default function SuspendedPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-muted">جارٍ التحميل…</div>}>
      <Suspended />
    </Suspense>
  );
}

// Shown to members of an office that the platform owner has suspended. They can still write to support.
async function Suspended() {
  const supabase = await createClient();
  const { data: cl } = await supabase.auth.getClaims();
  if (!cl?.claims?.sub) redirect("/login");
  const list = await myTickets();
  return (
    <main className="flex flex-1 items-start justify-center p-6">
      <div className="mt-10 w-full max-w-xl space-y-5 rounded-2xl border border-line bg-white p-7 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-brand">حساب المكتب موقوف مؤقتاً</h1>
          <p className="mt-2 leading-7 text-muted">
            أوقفت إدارة منصة {BRAND.name} الوصول إلى حساب مكتبك مؤقتاً. بياناتك محفوظة ولم يُحذف منها شيء، وتعود كما هي عند إعادة التفعيل. للاستفسار راسل إدارة المنصة من هنا:
          </p>
        </div>
        <SupportForm />
        <TicketList list={list} />
        <form action={signOut}>
          <button className="text-sm text-muted hover:text-red-700">تسجيل الخروج</button>
        </form>
      </div>
    </main>
  );
}
