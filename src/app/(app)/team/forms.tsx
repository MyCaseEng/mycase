"use client";
import { useActionState, useState, useTransition } from "react";
import { invite, cancelInvite, setRole, setActive, type Result } from "./actions";
import Confirm2 from "@/components/confirm2";

const ROLES = [
  ["member", "عضو الفريق"],
  ["admin", "مدير المكتب"],
  ["viewer", "مطّلع (قراءة فقط)"],
] as const;

export function InviteForm() {
  const [state, action, pending] = useActionState<Result, FormData>(invite, null);
  return (
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
      <input name="display" required placeholder="الاسم (مثل: م. خالد)" className="rounded-lg border border-line px-3 py-2" />
      <input name="email" type="email" required dir="ltr" placeholder="email@example.com" className="rounded-lg border border-line px-3 py-2" />
      <select name="role" className="rounded-lg border border-line px-3 py-2">
        {ROLES.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <button disabled={pending} className="rounded-lg bg-ink hover:bg-ink-hover px-4 py-2 font-semibold text-white disabled:opacity-60">
        دعوة
      </button>
      {state && <p className={`text-sm sm:col-span-4 ${state.ok ? "text-green-700" : "text-red-700"}`}>{state.text}</p>}
    </form>
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
