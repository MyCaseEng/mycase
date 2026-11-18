"use client";
// "Start here": the first steps of a new office, ticked off as they are done. Closes by itself when all are done.
import Link from "next/link";
import { useEffect, useState } from "react";

export type StartStep = { key: string; label: string; href: string; guide: string; done: boolean | "local" };

const LOCAL: Record<string, string> = { sample: "mc-sample-seen", doc: "mc-doc-made" };

export default function StartHere({ steps }: { steps: StartStep[] }) {
  const [local, setLocal] = useState<Record<string, boolean> | null>(null);
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only flags, read once after mount
      setHidden(localStorage.getItem("mc-start-hidden") === "1");
      setLocal(Object.fromEntries(Object.entries(LOCAL).map(([k, v]) => [k, localStorage.getItem(v) === "1"])));
    } catch {
      setHidden(false);
      setLocal({});
    }
  }, []);
  if (!local || hidden) return null;
  const done = (s: StartStep) => (s.done === "local" ? !!local[s.key] : s.done);
  const n = steps.filter(done).length;
  if (n === steps.length) return null;
  return (
    <section className="rounded-2xl border border-brand/30 bg-white p-4">
      <div className="flex items-baseline gap-2">
        <h2 className="flex-1 font-semibold">
          ابدأ من هنا <span className="text-sm font-normal text-muted">· {n} من {steps.length}</span>
        </h2>
        <Link href="/guide" className="text-sm text-brand hover:underline">دليل الاستخدام</Link>
        <button
          onClick={() => {
            try { localStorage.setItem("mc-start-hidden", "1"); } catch {}
            setHidden(true);
          }}
          className="text-sm text-muted hover:text-brand"
        >
          إغلاق
        </button>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-line">
        <div className="h-1.5 rounded-full bg-emerald-600 transition-all" style={{ width: `${(n / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {steps.map((s) => {
          const ok = done(s);
          return (
            <li key={s.key} className="flex items-center gap-2 text-sm">
              <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] ${ok ? "bg-emerald-600 text-white" : "border border-line"}`}>{ok ? "✓" : ""}</span>
              {ok ? (
                <span className="text-muted line-through">{s.label}</span>
              ) : (
                <Link href={s.href} className="font-medium hover:text-brand">{s.label}</Link>
              )}
              {!ok && (
                <Link href={`/guide#${s.guide}`} className="text-xs text-muted hover:text-brand">كيف؟</Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
