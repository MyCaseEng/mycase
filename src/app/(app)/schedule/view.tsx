"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtD, inDays, todayStr } from "@/lib/format";

export type Item = {
  id: string;
  caseId: string;
  type: "جلسة" | "اجتماع" | "معاينة";
  date: string;
  time: string;
  place: string;
  note: string;
  caseNo: string;
  parties: string;
  invited: string;
  delivered: boolean;
};

const TYPES = [
  ["visits", "الاجتماعات والمعاينات"],
  ["hearings", "الجلسات"],
] as const;
const WEEKDAY = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const weekday = (d: string) => WEEKDAY[new Date(d + "T00:00:00Z").getUTCDay()];

export default function ScheduleView({ items }: { items: Item[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<(typeof TYPES)[number][0]>("visits");
  const [past, setPast] = useState(false);
  const today = todayStr();

  const groups = useMemo(() => {
    const list = items
      .filter((i) => (kind === "hearings" ? i.type === "جلسة" && !i.delivered : i.type !== "جلسة"))
      .filter((i) => (past ? i.date < today : i.date >= today))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time) * (past ? -1 : 1));
    const g = new Map<string, Item[]>();
    list.forEach((i) => g.set(i.date, [...(g.get(i.date) ?? []), i]));
    return [...g.entries()];
  }, [items, kind, past, today]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TYPES.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-full px-4 py-1.5 text-sm ${kind === k ? "bg-brand text-white" : "border border-line bg-white"}`}
          >
            {l}
          </button>
        ))}
        <span className="flex-1" />
        <button onClick={() => setPast(!past)} className="rounded-full border border-line bg-white px-4 py-1.5 text-sm">
          {past ? "← القادمة" : "السابقة"}
        </button>
      </div>

      {!groups.length && (
        <div className="rounded-xl border border-line bg-white p-8 text-center text-muted">
          {past ? "لا توجد مواعيد سابقة." : "لا توجد مواعيد قادمة. تُضاف المواعيد من صفحة كل دعوى."}
        </div>
      )}

      {groups.map(([date, list]) => (
        <section key={date} className="rounded-xl border border-line bg-white">
          <h2 className={`flex items-center gap-2 border-b border-line px-4 py-2 text-sm font-semibold ${date === today ? "bg-amber-50" : ""}`}>
            <span>
              {weekday(date)} {fmtD(date)}
            </span>
            <span className="font-normal text-muted">({inDays(date)})</span>
          </h2>
          <ul>
            {list.map((i) => (
              <li
                key={i.id}
                onClick={() => router.push(`/cases/${i.caseId}`)}
                className="grid cursor-pointer gap-1 border-b border-line px-4 py-3 text-sm last:border-0 hover:bg-background sm:grid-cols-[5rem_6rem_1fr_1fr]"
              >
                <span dir="ltr" className="text-right font-semibold">{i.time || "—"}</span>
                <span className={`font-semibold ${i.type === "معاينة" ? "text-emerald-700" : i.type === "جلسة" ? "text-red-700" : "text-brand"}`}>
                  {i.type}
                </span>
                <span>
                  <b>{i.caseNo}</b>
                  <span className="block text-muted">{i.parties}</span>
                </span>
                <span className="text-muted">
                  {i.type === "جلسة" ? i.note : i.invited}
                  {i.place && <span className="block">{i.place}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
