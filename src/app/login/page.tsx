"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";
import { TERMS_VERSION } from "@/lib/terms";
import { isStaffId, toAuthEmail } from "@/lib/staff";
import { OfficeFields, TermsBox } from "@/app/welcome/form";

type Mode = "signin" | "signup" | "forgot";

const AUTH_ERRORS: Record<string, string> = {
  "Invalid login credentials": "البريد أو كلمة المرور غير صحيحة.",
  "Email not confirmed": "لم يُؤكَّد البريد بعد. افتح رسالة التأكيد في بريدك.",
  "User already registered": "هذا البريد مسجّل من قبل. استخدم تسجيل الدخول.",
};
const arError = (m: string) =>
  AUTH_ERRORS[m] ||
  (m.toLowerCase().includes("rate limit") ? "محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة." : m);

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [agree, setAgree] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const origin = window.location.origin;
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: toAuthEmail(email), password });
        if (error) throw error;
        router.replace("/");
        router.refresh();
        return;
      }
      if (mode === "signup") {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error("اكتب بريدًا إلكترونيًا صحيحًا. معرّفات الفريق يُنشئها مدير المكتب.");
        if (password.length < 8) throw new Error("كلمة المرور 8 أحرف على الأقل.");
        if (password !== confirm) throw new Error("كلمتا المرور غير متطابقتين.");
        if (!agree) throw new Error("يلزم الموافقة على شروط الاستخدام لإنشاء الحساب.");
        // the office details travel with the account; the first visit creates the office from them
        const f = new FormData(e.currentTarget as HTMLFormElement);
        const office = Object.fromEntries(["name", "country", "specialty", "reg", "display"].map((k) => [k, String(f.get(k) ?? "").trim()]));
        if (!office.name || !office.display) throw new Error("اكتب اسم المكتب واسمك كما يظهر للفريق.");
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${origin}/auth/callback`, data: { terms_version: TERMS_VERSION, office } },
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/welcome");
          router.refresh();
          return;
        }
        setMsg({ ok: true, text: "أُرسلت رسالة تأكيد إلى بريدك. افتحها واضغط الرابط، ثم سجّل الدخول، ويُجهَّز مكتبك تلقائيًا." });
      }
      if (mode === "forgot") {
        if (isStaffId(email)) {
          setMsg({ ok: true, text: "حسابات الفريق يعيد تعيين كلمة مرورها مدير المكتب من صفحة «الفريق». تواصل معه." });
          return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/auth/callback?next=/reset-password`,
        });
        if (error) throw error;
        setMsg({ ok: true, text: "إن كان البريد مسجّلاً فستصلك رسالة لتعيين كلمة مرور جديدة." });
      }
    } catch (err) {
      setMsg({ ok: false, text: arError((err as Error).message) });
    } finally {
      setBusy(false);
    }
  }

  const title = { signin: "تسجيل الدخول", signup: "إنشاء حساب", forgot: "استعادة كلمة المرور" }[mode];

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className={`w-full ${mode === "signup" ? "max-w-md" : "max-w-sm"} rounded-2xl border border-line bg-white p-7 shadow-sm`}>
        <div className="flex items-center gap-3">
          <Image src="/icons/icon-192.png" alt="" width={44} height={44} className="rounded-xl" priority />
          <div>
            <div className="text-xl font-bold text-brand">{BRAND.name}</div>
            <div className="text-xs text-muted">{BRAND.tagline}</div>
          </div>
        </div>
        <h1 className="mt-6 text-lg font-semibold">{title}</h1>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm text-muted">{mode === "signin" ? "البريد الإلكتروني أو معرّف الدخول" : "البريد الإلكتروني"}</span>
            <input
              type={mode === "signin" ? "text" : "email"}
              required
              dir="ltr"
              autoCapitalize="none"
              autoComplete={mode === "signin" ? "username" : "email"}
              placeholder={mode === "signin" ? "name@gmail.com  أو  ahmed@qat123" : undefined}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand"
            />
          </label>
          {mode !== "forgot" && (
            <label className="block">
              <span className="text-sm text-muted">كلمة المرور</span>
              <input
                type="password"
                required
                dir="ltr"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand"
              />
            </label>
          )}
          {mode === "signup" && (
            <>
              <label className="block">
                <span className="text-sm text-muted">تأكيد كلمة المرور</span>
                <input
                  type="password"
                  required
                  dir="ltr"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:border-brand ${confirm && confirm !== password ? "border-red-400" : "border-line"}`}
                />
                {confirm && confirm !== password && <span className="text-xs text-red-700">كلمتا المرور غير متطابقتين.</span>}
              </label>
              <div className="space-y-3 border-t border-line pt-3">
                <b className="text-sm">بيانات المكتب</b>
                <OfficeFields />
              </div>
              <TermsBox checked={agree} onChange={setAgree} />
            </>
          )}
          {msg && (
            <p className={`rounded-lg p-3 text-sm ${msg.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
              {msg.text}
            </p>
          )}
          <button
            disabled={busy}
            className="w-full rounded-lg bg-ink hover:bg-ink-hover py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {busy ? "لحظة…" : title}
          </button>
        </form>
        <div className="mt-5 flex flex-wrap justify-between gap-2 text-sm">
          {mode !== "signin" && (
            <button onClick={() => { setMode("signin"); setMsg(null); }} className="text-brand underline-offset-4 hover:underline">
              عندي حساب، تسجيل الدخول
            </button>
          )}
          {mode !== "signup" && (
            <button onClick={() => { setMode("signup"); setMsg(null); }} className="text-brand underline-offset-4 hover:underline">
              إنشاء حساب جديد
            </button>
          )}
          {mode === "signin" && (
            <button onClick={() => { setMode("forgot"); setMsg(null); }} className="text-muted underline-offset-4 hover:underline">
              نسيت كلمة المرور؟
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
