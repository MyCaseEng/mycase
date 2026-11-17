"use client";
import { useActionState, useState, useTransition } from "react";
import { addStaff, resetStaffPassword, cancelInvite, setRole, setActive, type Result, type StaffResult } from "./actions";
import Confirm2 from "@/components/confirm2";

const ROLES = [
  ["member", "عضو الفريق"],
  ["admin", "مدير المكتب"],
  ["viewer", "مطّلع (قراءة فقط)"],
] as const;

// Shown once after creating an account or resetting a password: the expert copies it to the team member.
function Credentials({ r, onClose }: { r: StaffResult; onClose?: () => void }) {
  const [copied, setCopied] = useState(false);
  if (!r?.ok || !r.password) return null;
  const text = `رابط المنصة: ${typeof window !== "undefined" ? window.location.origin : ""}\nمعرّف الدخول: ${r.login}\nكلمة المرور المؤقتة: ${r.password}`;
  return (
    <div className="space-y-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm">
      <b className="text-green-800">{r.text}</b>
      <div className="grid gap-1 font-mono" dir="ltr">
        <div className="text-right font-sans text-xs text-muted">معرّف الدخول</div>
        <div className="rounded bg-white px-3 py-1.5 text-base">{r.login}</div>
        <div className="text-right font-sans text-xs text-muted">كلمة المرور المؤقتة</div>
        <div className="rounded bg-white px-3 py-1.5 text-base tracking-wider">{r.password}</div>
      </div>
      <p className="text-xs text-muted">تظهر كلمة المرور هنا مرة واحدة فقط. انسخها وأرسلها للموظف، وسيُطلب منه تغييرها عند أول دخول.</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(text).then(() => setCopied(true))}
          className="rounded-lg bg-ink px-4 py-1.5 font-semibold text-white hover:bg-ink-hover"
        >
          {copied ? "✓ نُسخت" : "نسخ بيانات الدخول"}
        </button>
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-lg border border-line bg-white px-4 py-1.5">
            إغلاق
          </button>
        )}
      </div>
    </div>
  );
}

export function StaffForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState<StaffResult, FormData>(addStaff, null);
  return (
    <div className="mt-4 space-y-3">
      <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
        <input name="display" required placeholder="الاسم (مثل: م. أحمد)" className="rounded-lg border border-line px-3 py-2" />
        <div className="flex items-center rounded-lg border border-line focus-within:border-brand" dir="ltr">
          <input
            name="user"
            required
            pattern="[a-zA-Z][a-zA-Z0-9._\-]{1,29}"
            autoCapitalize="none"
            placeholder="ahmed"
            className="w-full min-w-0 rounded-lg px-3 py-2 outline-none"
          />
          <span className="whitespace-nowrap pr-3 text-sm text-muted">@{code || "…"}</span>
        </div>
        <select name="role" className="rounded-lg border border-line px-3 py-2">
          {ROLES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button disabled={pending} className="rounded-lg bg-ink px-4 py-2 font-semibold text-white hover:bg-ink-hover disabled:opacity-60">
          {pending ? "لحظة…" : "إنشاء الحساب"}
        </button>
      </form>
      {state && !state.ok && <p className="text-sm text-red-700">{state.text}</p>}
      <Credentials r={state} />
    </div>
  );
}

export function ResetPassword({ userId }: { userId: string }) {
  const [pending, start] = useTransition();
  const [r, setR] = useState<StaffResult>(null);
  return (
    <>
      <Confirm2
        label={pending ? "لحظة…" : "كلمة مرور جديدة"}
        confirmLabel="تأكيد إعادة التعيين"
        onConfirm={() => start(async () => setR(await resetStaffPassword(userId)))}
      />
      {r && !r.ok && <span className="text-xs text-red-700">{r.text}</span>}
      {r?.ok && (
        <div className="basis-full">
          <Credentials r={r} onClose={() => setR(null)} />
        </div>
      )}
    </>
  );
}

export function MemberControls({ userId, role, active }: { userId: string; role: string; active: boolean }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState<Result>(null);
  return (
    <div className="flex items-center gap-2">
      <select
        defaultValue={role}
        disabled={pending}
        onChange={(e) => start(async () => setNote(await setRole(userId, e.target.value)))}
        className="rounded-lg border border-line px-2 py-1 text-sm"
      >
        {ROLES.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      {active ? (
        <Confirm2 label="إيقاف" confirmLabel="تأكيد الإيقاف" onConfirm={() => start(async () => setNote(await setActive(userId, false)))} />
      ) : (
        <button
          onClick={() => start(async () => setNote(await setActive(userId, true)))}
          className="rounded-lg border border-line px-3 py-1 text-sm"
        >
          إعادة تفعيل
        </button>
      )}
      {note && !note.ok && <span className="text-xs text-red-700">{note.text}</span>}
    </div>
  );
}

export function CancelInvite({ id }: { id: string }) {
  const [, start] = useTransition();
  return <Confirm2 label="إلغاء" confirmLabel="تأكيد الإلغاء" onConfirm={() => start(() => cancelInvite(id))} />;
}
