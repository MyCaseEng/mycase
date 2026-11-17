"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";
import { changeOwnPassword } from "./actions";

// First sign-in of a team account (or after the expert reset it): replace the temporary password with one's own.
export default function ChangePasswordPage() {
  const router = useRouter();
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (p1.length < 8) return setErr("كلمة المرور 8 أحرف على الأقل.");
    if (p1 !== p2) return setErr("كلمتا المرور غير متطابقتين.");
    setBusy(true);
    const r = await changeOwnPassword(p1);
    if (!r.ok) {
      setBusy(false);
      return setErr(/different|same/i.test(r.text) ? "اختر كلمة مرور مختلفة عن المؤقتة." : r.text);
    }
    // full reload so every page reads the cleared flag
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-white p-7 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-brand">أهلًا بك في {BRAND.name}</h1>
          <p className="mt-2 text-sm leading-7 text-muted">
            دخلتَ بكلمة مرور مؤقتة من مدير مكتبك. اختر الآن كلمة مرور خاصة بك، لا يعرفها غيرك.
          </p>
        </div>
        <label className="block">
          <span className="text-sm text-muted">كلمة المرور الجديدة</span>
          <input type="password" required dir="ltr" autoComplete="new-password" value={p1} onChange={(e) => setP1(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand" />
        </label>
        <label className="block">
          <span className="text-sm text-muted">تأكيد كلمة المرور</span>
          <input type="password" required dir="ltr" autoComplete="new-password" value={p2} onChange={(e) => setP2(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand" />
        </label>
        {err && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-ink py-2.5 font-semibold text-white hover:bg-ink-hover disabled:opacity-60">
          {busy ? "لحظة…" : "حفظ والدخول إلى المنصة"}
        </button>
        <button type="button" onClick={signOut} className="text-xs text-muted hover:text-red-700">
          تسجيل الخروج
        </button>
      </form>
    </main>
  );
}
