import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TermsText from "@/components/terms-text";
import SubmitButton from "@/components/submit-button";
import { TERMS_VERSION } from "@/lib/terms";

// Shown to an existing user who has not yet accepted the current version of the terms.
async function accept(formData: FormData) {
  "use server";
  if (formData.get("agree") !== "on") return;
  const supabase = await createClient();
  await supabase.rpc("accept_terms", { p_version: TERMS_VERSION });
  redirect("/");
}

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default function AcceptTermsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-muted">جارٍ التحميل…</div>}>
      <AcceptTerms />
    </Suspense>
  );
}

async function AcceptTerms() {
  const supabase = await createClient();
  const { data: cl } = await supabase.auth.getClaims();
  if (!cl?.claims?.sub) redirect("/login");
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6 md:p-10">
      <div className="rounded-2xl border border-line bg-white shadow-sm">
        <div className="max-h-[62vh] overflow-y-auto p-6 md:p-10">
          <TermsText />
        </div>
        <form action={accept} className="space-y-3 border-t border-line bg-background/60 p-6">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="agree" required className="mt-1 size-4 accent-[var(--brand)]" />
            <span>قرأتُ شروط الاستخدام وأوافق عليها.</span>
          </label>
          <div className="flex items-center justify-between gap-3">
            <SubmitButton pendingText="لحظة…" className="rounded-lg bg-ink px-6 py-2.5 font-semibold text-white hover:bg-ink-hover">
              موافق، الدخول إلى المنصة
            </SubmitButton>
          </div>
        </form>
      </div>
      <form action={signOut} className="mt-3 text-center">
        <button className="text-xs text-muted hover:text-red-700">لا أوافق، تسجيل الخروج</button>
      </form>
    </main>
  );
}
