"use client";
// "Start here": the first steps of a new office, ticked off as they are done. Closes by itself when all are done.
import Link from "next/link";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui";
import { GUIDE, guideImg } from "@/lib/guide";

export type StartStep = { key: string; label: string; href: string; guide: string; done: boolean | "local" };

const LOCAL: Record<string, string> = { sample: "mc-sample-seen", doc: "mc-doc-made" };

export default function StartHere({ steps }: { steps: StartStep[] }) {
  const [local, setLocal] = useState<Record<string, boolean> | null>(null);
  const [hidden, setHidden] = useState(true);
  const [how, setHow] = useState<string | null>(null); // the guide section shown in a window
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
                <button onClick={() => setHow(s.guide)} className="text-xs text-muted hover:text-brand">كيف؟</button>
              )}
            </li>
          );
        })}
      </ol>
      {how && <HowTo id={how} onClose={() => setHow(null)} />}
    </section>
  );
}

// Only the part of the guide that belongs to this step
function HowTo({ id, onClose }: { id: string; onClose: () => void }) {
  const g = GUIDE.find((x) => x.id === id);
  if (!g) return null;
  return (
    <Modal title={g.title} onClose={onClose} width="max-w-6xl">
      <p className="text-muted">{g.intro}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={guideImg(g.id)} alt={`صورة توضيحية: ${g.title}`} className="mt-3 max-h-[68vh] w-full rounded-xl border border-line bg-background object-contain" />
      <ol className="mt-3 space-y-2">
        {g.steps.map((t, i) => (
          <li key={t} className="flex gap-2 leading-7">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand">{i + 1}</span>
            <span>{t}</span>
          </li>
        ))}
      </ol>
      {g.href && g.open && (
        <Link href={g.href} onClick={onClose} className="mt-4 inline-block rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink-hover">
          افتح «{g.open}»
        </Link>
      )}
    </Modal>
  );
}
