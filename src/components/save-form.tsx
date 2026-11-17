"use client";
// A settings form that shows it is working: the button changes to «جارٍ الحفظ…» at once,
// then «✓ تم الحفظ» (or the error) appears next to it.
import { useActionState, useEffect, useState } from "react";

type Res = { ok: boolean; text: string } | null;

export default function SaveForm({
  action,
  className,
  children,
  canSave = true,
}: {
  action: (prev: Res, f: FormData) => Promise<Res>;
  className?: string;
  children: React.ReactNode;
  canSave?: boolean;
}) {
  const [res, run, pending] = useActionState(action, null);
  // a success note fades after 4 s; an error stays until the next save
  const [hidden, setHidden] = useState<Res>(null);
  const shown = res && res !== hidden ? res : null;
  useEffect(() => {
    if (!res?.ok) return;
    const t = setTimeout(() => setHidden(res), 4000);
    return () => clearTimeout(t);
  }, [res]);
  return (
    <form action={run} className={className}>
      {children}
      {canSave && (
        <div className="flex items-center gap-3">
          <button disabled={pending} className="rounded-lg bg-ink px-5 py-2 font-semibold text-white transition active:scale-95 hover:bg-ink-hover disabled:cursor-wait disabled:opacity-60">
            {pending ? "جارٍ الحفظ…" : "حفظ"}
          </button>
          {shown && <span className={`text-sm ${shown.ok ? "text-green-700" : "text-red-700"}`}>{shown.ok ? "✓ " : ""}{shown.text}</span>}
        </div>
      )}
    </form>
  );
}
