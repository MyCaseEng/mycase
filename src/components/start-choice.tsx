"use client";
// Shown once to the expert, 24 hours after the office was created: start the free trial (main) or subscribe now.
import { useState, useTransition } from "react";
import { PLANS, yearly, CURRENCY } from "@/lib/plans";
import { startTrial, requestSubscription } from "@/app/(app)/start-actions";

export default function StartChoice() {
  const [step, setStep] = useState<"choose" | "plans" | "done">("choose");
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");
  const [plan, setPlan] = useState("office");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const run = (f: () => Promise<{ ok: boolean; text: string }>) =>
    start(async () => {
      const r = await f();
      setMsg(r);
      if (r.ok) setStep("done");
    });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        {step === "choose" && (
          <div className="text-center">
            <h2 className="text-xl font-bold text-brand">كيف وجدت المنصة؟</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted">
              تعرّفت على المنصة يومًا كاملًا مع الدعوى النموذجية. اختر الآن كيف تكمل: تجربة مجانية كاملة لمدة 30 يومًا بكل المزايا ودون أي دفع، أو اشترك مباشرة.
            </p>
            <button disabled={pending} onClick={() => run(startTrial)} className="mt-6 w-full rounded-xl bg-ink py-3 text-lg font-semibold text-white hover:bg-ink-hover disabled:opacity-60">
              ابدأ تجربتي المجانية · 30 يومًا
            </button>
            <button onClick={() => setStep("plans")} className="mt-3 w-full rounded-xl border border-line py-2.5 font-semibold hover:border-brand">
              اشترك الآن
            </button>
            {msg && !msg.ok && <p className="mt-3 text-sm text-red-700">{msg.text}</p>}
          </div>
        )}

        {step === "plans" && (
          <div>
            <div className="flex items-center gap-3">
              <h2 className="flex-1 text-lg font-bold">اختر باقتك</h2>
              <div className="flex rounded-lg border border-line p-0.5 text-sm">
                {(["monthly", "yearly"] as const).map((k) => (
                  <button key={k} onClick={() => setCycle(k)} className={`rounded-md px-3 py-1 ${cycle === k ? "bg-ink text-white" : ""}`}>
                    {k === "monthly" ? "شهري" : "سنوي · شهران مجانًا"}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {PLANS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPlan(p.key)}
                  className={`rounded-xl border p-4 text-start transition ${plan === p.key ? "border-2 border-brand bg-brand-soft/40" : "border-line hover:border-brand/50"}`}
                >
                  <div className="font-bold">{p.name}</div>
                  <div className="text-xs text-muted">{p.who}</div>
                  <div className="mt-3 text-2xl font-bold tabular-nums">
                    {(cycle === "yearly" ? yearly(p) : p.monthly).toLocaleString("en")}
                    <span className="text-sm font-normal text-muted"> {CURRENCY} / {cycle === "yearly" ? "سنة" : "شهر"}</span>
                  </div>
                  <ul className="mt-2 space-y-0.5 text-xs text-muted">
                    <li>حتى {p.users} مستخدمين</li>
                    <li>{p.reads} قراءة أحكام آلية شهريًا</li>
                    <li>كل ميزات إدارة الدعاوى</li>
                  </ul>
                </button>
              ))}
            </div>
            <p className="mt-4 rounded-lg bg-background p-3 text-xs leading-6 text-muted">
              الدفع حاليًا بالتحويل البنكي: نرسل لك بياناته بعد الطلب، ويُفعَّل اشتراكك عند وصول التحويل. وخلال ذلك تعمل المنصة بالتجربة المجانية.
            </p>
            <div className="mt-4 flex gap-2">
              <button disabled={pending} onClick={() => run(() => requestSubscription(plan, cycle))} className="flex-1 rounded-xl bg-ink py-2.5 font-semibold text-white hover:bg-ink-hover disabled:opacity-60">
                أرسل طلب الاشتراك
              </button>
              <button onClick={() => setStep("choose")} className="rounded-xl border border-line px-4 py-2.5 text-sm">
                رجوع
              </button>
            </div>
            {msg && !msg.ok && <p className="mt-3 text-sm text-red-700">{msg.text}</p>}
          </div>
        )}

        {step === "done" && (
          <div className="text-center">
            <h2 className="text-xl font-bold text-emerald-700">تم</h2>
            <p className="mt-2 text-sm leading-7">{msg?.text}</p>
            <button onClick={() => window.location.reload()} className="mt-5 rounded-xl bg-ink px-8 py-2.5 font-semibold text-white hover:bg-ink-hover">
              متابعة العمل
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
