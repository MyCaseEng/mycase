"use client";
// Home: where every active case stands in its life cycle (steps worked out from the case data).
import Link from "next/link";
import { useState } from "react";
import { STEPS, type Tone } from "@/lib/lifecycle";

export type LifeRow = {
  id: string;
  label: string;
  party: string;
  cur: number;
  tone: Tone;
  note: string;
  replies: { sent: number; done: number; late: number; tone: Tone } | null;
};

const RANK: Record<Tone, number> = { red: 0, amber: 1, calm: 2, none: 2 };
const RING: Record<Tone, string> = { red: "stroke-red-600", amber: "stroke-amber-500", calm: "stroke-emerald-600", none: "stroke-emerald-600" };
const RING_TXT: Record<Tone, string> = { red: "fill-red-800", amber: "fill-amber-800", calm: "fill-emerald-800", none: "fill-emerald-800" };
const TXT: Record<Tone, string> = { red: "text-red-700", amber: "text-amber-700", calm: "text-muted", none: "text-muted" };
const TILE: Record<Tone, string> = {
  red: "border-red-200 bg-red-50 text-red-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  calm: "border-line bg-white",
  none: "border-line bg-white",
};

export default function LifeBoard({ rows }: { rows: LifeRow[] }) {
  const [step, setStep] = useState<number | null>(null);
  // steps 1..6 can be "current"; the first (receiving the judgment) is done the moment the case is added
  const tiles = STEPS.map((name, i) => {
    const list = rows.filter((r) => r.cur === i);
    const tone = list.reduce<Tone>((w, r) => (RANK[r.tone] < RANK[w] ? r.tone : w), "none");
    return { i, name, n: list.length, tone };
  }).slice(1);
  const shown = rows
    .filter((r) => step === null || r.cur === step)
    .sort((a, b) => RANK[a.tone] - RANK[b.tone] || a.cur - b.cur);

  return (
    <section className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="flex-1 font-semibold">دورة حياة الدعاوى</h2>
        {step !== null && (
          <button onClick={() => setStep(null)} className="text-sm text-brand hover:underline">
            عرض الكل ({rows.length})
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {tiles.map((t) => (
          <button
            key={t.i}
            onClick={() => setStep(step === t.i ? null : t.i)}
            className={`rounded-xl border p-2 text-center transition ${TILE[t.n ? t.tone : "none"]} ${step === t.i ? "ring-2 ring-brand" : "hover:border-brand/50"} ${t.n ? "" : "opacity-60"}`}
          >
            <div className="text-xs leading-4">{t.name}</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{t.n}</div>
          </button>
        ))}
      </div>

      <div className="mt-4 divide-y divide-line">
        {shown.map((r) => (
          <Link key={r.id} href={`/cases/${r.id}`} className="grid gap-x-4 gap-y-1.5 rounded-lg px-2 py-2.5 hover:bg-background md:grid-cols-[minmax(0,14rem)_minmax(0,19rem)_minmax(0,1fr)] md:items-center">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{r.label}</div>
              <div className="truncate text-xs text-muted">{r.party}</div>
            </div>
            <div className="flex items-center gap-3">
              <Ring done={r.cur} tone={r.tone} />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{STEPS[r.cur] ?? "تم التسليم"}</div>
                <div className="truncate text-xs text-muted">
                  المرحلة {r.cur + 1} من {STEPS.length}
                  {STEPS[r.cur + 1] ? ` · التالي: ${STEPS[r.cur + 1]}` : ""}
                </div>
              </div>
            </div>
            <div className="min-w-0 text-xs">
              <div className={`${TXT[r.tone]} ${r.tone === "red" || r.tone === "amber" ? "font-semibold" : ""}`}>{r.note}</div>
              {r.replies && (
                <div className={`mt-0.5 ${r.replies.late ? "text-red-700" : r.replies.done === r.replies.sent ? "text-emerald-700" : "text-muted"}`}>
                  الردود {r.replies.done} من {r.replies.sent}
                  {r.replies.late ? ` · متأخر ${r.replies.late}` : r.replies.done === r.replies.sent ? " · اكتملت" : ""}
                </div>
              )}
            </div>
          </Link>
        ))}
        {!shown.length && <p className="py-4 text-center text-sm text-muted">لا دعاوى في هذه المرحلة.</p>}
      </div>
    </section>
  );
}

// steps done out of all steps, coloured by how the current step is going
function Ring({ done, tone }: { done: number; tone: Tone }) {
  const r = 18, len = 2 * Math.PI * r, part = (done / STEPS.length) * len;
  return (
    <svg width="46" height="46" viewBox="0 0 44 44" className="shrink-0" role="img" aria-label={`أُنجز ${done} من ${STEPS.length}`}>
      <circle cx="22" cy="22" r={r} fill="none" strokeWidth="5" className="stroke-line" />
      <circle cx="22" cy="22" r={r} fill="none" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${part} ${len}`} transform="rotate(-90 22 22)" className={RING[tone]} />
      <text x="22" y="26" textAnchor="middle" fontSize="11" fontWeight="600" className={RING_TXT[tone]}>
        {done}/{STEPS.length}
      </text>
    </svg>
  );
}
