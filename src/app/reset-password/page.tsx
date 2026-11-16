"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setMsg("كلمة المرور 8 أحرف على الأقل.");
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setMsg("تعذّر الحفظ. افتح رابط الاستعادة من بريدك مرة أخرى.");
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <form onSubmit={save} className="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-white p-7 shadow-sm">
        <h1 className="text-lg font-semibold">كلمة مرور جديدة</h1>
        <input
          type="password"
          dir="ltr"
          autoComplete="new-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand"
        />
        {msg && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{msg}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-brand py-2.5 font-semibold text-white disabled:opacity-60">
          حفظ
        </button>
      </form>
    </main>
  );
}
