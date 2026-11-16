"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import type { Alert, Level } from "@/lib/alerts";
import { todayStr } from "@/lib/format";
import { snoozeAlert } from "@/app/(app)/alerts-actions";
import { Modal } from "./ui";

export type CaseAlerts = { caseId: string; label: string; alerts: Alert[] };

export const DOT: Record<Level, string> = { red: "bg-red-600", amber: "bg-amber-500", calm: "bg-slate-300" };
const ROW: Record<Level, string> = { red: "border-red-200 bg-red-50", amber: "border-amber-200 bg-amber-50", calm: "border-line bg-white" };
const ANCHOR: Record<string, string> = { questions: "#questions", event: "#events", hearings: "#data", party: "#data", case: "" };

function addDays(n: number) {
  const d = new Date(todayStr() + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function SnoozeModal({ a, onClose }: { a: Alert; onClose: () => void }) {
  const [date, setDate] = useState(addDays(3));
  const [pending, start] = useTransition();
  const go = (until: string) => start(async () => { await snoozeAlert(a.caseId, a.key, until); onClose(); });
  return (
    <Modal title="إخفاء التنبيه" onClose={onClose} width="max-w-md">
      <p className="mb-3 text-sm">{a.text}</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {[1, 3, 7, 14, 30].map((n) => (
          <button key={n} disabled={pending} onClick={() => go(addDays(n))} className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-background">
            {n === 1 ? "يوم" : n === 7 ? "أسبوع" : n === 14 ? "أسبوعان" : n === 30 ? "شهر" : `${n} أيام`}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted">حتى تاريخ:</span>
        <input type="date" value={date} min={todayStr()} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-line px-2 py-1 text-sm" />
        <button disabled={pending} onClick={() => go(date)} className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white">
          إخفاء
        </button>
      </div>
    </Modal>
  );
}

export function AlertLine({ a, href, onNavigate, canWrite = true }: { a: Alert; href: string; onNavigate?: () => void; canWrite?: boolean }) {
  const [snz, setSnz] = useState(false);
  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm ${ROW[a.level]}`}>
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[a.level]}`} />
      <span className="min-w-40 flex-1">{a.text}</span>
      <Link href={href + (ANCHOR[a.act] ?? "")} onClick={onNavigate} className="rounded-md border border-line bg-white px-2 py-0.5 text-xs hover:border-brand">
        {a.actLabel}
      </Link>
      {canWrite && (
        <button onClick={() => setSnz(true)} className="text-xs text-muted hover:text-brand">
          إخفاء
        </button>
      )}
      {snz && <SnoozeModal a={a} onClose={() => setSnz(false)} />}
    </div>
  );
}

export function Bell({ groups }: { groups: CaseAlerts[] }) {
  const [open, setOpen] = useState(false);
  const all = groups.flatMap((g) => g.alerts);
  const urgent = all.filter((a) => a.level !== "calm").length;
  const red = all.some((a) => a.level === "red");
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="التنبيهات" className="relative rounded-lg border border-line bg-white px-2.5 py-1 text-lg leading-none">
        🔔
        {urgent > 0 && (
          <span className={`absolute -left-1.5 -top-1.5 min-w-5 rounded-full px-1 text-center text-[11px] font-bold text-white ${red ? "bg-red-600" : "bg-amber-500"}`}>
            {urgent}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <aside className="absolute inset-y-0 left-0 w-full max-w-md overflow-y-auto bg-background p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center">
              <h2 className="flex-1 text-lg font-bold">التنبيهات</h2>
              <button onClick={() => setOpen(false)} className="text-xl text-muted">×</button>
            </div>
            {!groups.length && <p className="rounded-xl bg-white p-6 text-center text-muted">لا توجد تنبيهات. كل شيء في وقته.</p>}
            <div className="space-y-4">
              {groups.map((g) => (
                <section key={g.caseId} className="rounded-xl bg-white p-3">
                  <Link href={`/cases/${g.caseId}`} onClick={() => setOpen(false)} className="mb-2 block font-semibold text-brand hover:underline">
                    {g.label}
                  </Link>
                  <div className="space-y-1.5">
                    {g.alerts.map((a) => (
                      <AlertLine key={a.key} a={a} href={`/cases/${g.caseId}`} onNavigate={() => setOpen(false)} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
