"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import SubmitButton from "@/components/submit-button";
import { COUNTRIES, DEFAULT_COUNTRY } from "@/lib/countries";
import { SPECIALTIES, DEFAULT_SPECIALTY } from "@/lib/specialties";
import { createOfficeForm, createFromSignup } from "./actions";
import type { SetupRes } from "@/lib/office-setup";

// a full reload after the office exists, so every page reads the new membership
const goIn = () => window.location.assign("/"); // eslint-disable-line @next/next/no-location-assign-relative-destination

const field = "w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-brand";

// The office details, shared by the sign-up form and the welcome page
export function OfficeFields({ v }: { v?: Partial<Record<string, string>> }) {
  return (
    <>
      <input name="name" required defaultValue={v?.name} placeholder="اسم المكتب" className={field} />
      <label className="block text-sm text-muted">
        دولة المكتب
        <select name="country" defaultValue={v?.country || DEFAULT_COUNTRY} className={`mt-1 bg-white text-foreground ${field}`}>
          {COUNTRIES.map(([c, n]) => (
            <option key={c} value={c}>{n}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm text-muted">
        نوع وتخصص الخبرة
        <select name="specialty" defaultValue={v?.specialty || DEFAULT_SPECIALTY} className={`mt-1 bg-white text-foreground ${field}`}>
          {SPECIALTIES.map((sp) => (
            <option key={sp.code} value={sp.code}>{sp.name}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm text-muted">
        رقم قيد الخبير
        <input name="reg" dir="ltr" maxLength={40} defaultValue={v?.reg} placeholder="كما في شهادة القيد لدى الجهة المختصة" className={`mt-1 text-right text-foreground ${field}`} />
        <span className="mt-1 block text-xs">يُطبع في ترويسة النماذج، ويدخل في الرقم المرجعي لمستنداتك. يمكن تعديله لاحقاً من الإعدادات.</span>
      </label>
      <input name="display" required defaultValue={v?.display} placeholder="اسمك كما يظهر للفريق" className={field} />
    </>
  );
}

export function TermsBox({ checked, onChange }: { checked?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2 rounded-lg bg-background p-3 text-sm">
      <input
        type="checkbox"
        name="agree"
        required
        {...(onChange ? { checked, onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.checked) } : {})}
        className="mt-1 size-4 accent-[var(--brand)]"
      />
      <span>
        قرأتُ{" "}
        <a href="/terms" target="_blank" className="font-semibold text-brand underline underline-offset-4">
          شروط الاستخدام
        </a>{" "}
        وأوافق عليها، وأقرّ بأنني الخبير صاحب المكتب أو مفوَّض عنه.
      </span>
    </label>
  );
}

export function OfficeForm({ v }: { v?: Partial<Record<string, string>> }) {
  const [res, action] = useActionState<SetupRes, FormData>(createOfficeForm, null);
  useEffect(() => {
    if (res?.ok && !res.text) goIn();
  }, [res]);
  return (
    <form action={action} className="space-y-3">
      <OfficeFields v={v} />
      <TermsBox />
      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">سنضيف إلى مكتبك دعوى نموذجية ببيانات تجريبية لتتعرّف على المنصة، ويمكنك حذفها متى شئت.</p>
      {res && <p className={`rounded-lg p-3 text-sm ${res.ok ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-700"}`}>{res.text}</p>}
      {res?.ok && (
        <button type="button" onClick={goIn} className="w-full rounded-lg border border-line py-2 font-semibold">متابعة إلى المكتب</button>
      )}
      <SubmitButton pendingText="جارٍ إنشاء المكتب…" className="w-full rounded-lg bg-ink py-2.5 font-semibold text-white hover:bg-ink-hover">
        إنشاء المكتب
      </SubmitButton>
    </form>
  );
}

// After the one-step sign-up: the office is created from the details kept with the account
export function AutoSetup({ v }: { v: Partial<Record<string, string>> }) {
  const [res, setRes] = useState<SetupRes>(null);
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    createFromSignup().then((r) => {
      if (r?.ok && !r.text) goIn();
      else setRes(r);
    });
  }, []);
  if (!res) return <p className="py-6 text-center text-muted">جارٍ تجهيز مكتبك…</p>;
  if (res.ok)
    return (
      <div className="space-y-3">
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{res.text}</p>
        <button onClick={goIn} className="w-full rounded-lg bg-ink py-2.5 font-semibold text-white">متابعة</button>
      </div>
    );
  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{res.text}</p>
      <OfficeForm v={v} />
    </div>
  );
}
