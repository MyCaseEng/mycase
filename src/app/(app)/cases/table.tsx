"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SRCS, todayStr, days } from "@/lib/format";
import { buildXlsx, CASE_COLS, XLSX_MIME } from "@/lib/xlsx";
import { saveBlob } from "@/lib/docx";

export type Row = {
  id: string;
  caseNo: string;
  caseType: string;
  src: string;
  srcLabel: string;
  p1: string;
  p2: string;
  team: string;
  delivered: boolean;
  reportDate: string;
  hearing: { date: string; days: number; past: boolean } | null;
  search: string;
  x: (string | number)[];
};

const TABS = [
  ["all", "كل الدعاوى"],
  ["active", "النشطة"],
  ["delivered", "المسلّمة للمحكمة"],
] as const;

const SRC_TONE: Record<string, string> = {
  court: "bg-blue-50 text-blue-800",
  rent: "bg-amber-50 text-amber-800",
  assoc: "bg-emerald-50 text-emerald-800",
  panel: "bg-purple-50 text-purple-800",
};

// Arabic-insensitive search: ignore hamza forms, taa marbuta, alef maqsura and diacritics
const fold = (t: string) =>
  t.replace(/[ً-ْـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").toLowerCase();

export default function CasesTable({ rows, xHeader, xColor }: { rows: Row[]; xHeader: string; xColor: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("active");
  const [q, setQ] = useState("");
  const [src, setSrc] = useState("");
  const [sel, setSel] = useState<string | null>(null);

  const list = useMemo(() => {
    const fq = fold(q.trim());
    return rows.filter(
      (r) =>
        (tab === "all" || (tab === "active" ? !r.delivered : r.delivered)) &&
        (!src || r.src === src) &&
        (!fq || fold(r.search).includes(fq))
    );
  }, [rows, tab, q, src]);
  const count = (t: string) => rows.filter((r) => t === "all" || (t === "active" ? !r.delivered : r.delivered)).length;
  const open = (id: string) => router.push(`/cases/${id}`);
  // exports exactly what is on screen now (tab, search and filter applied)
  function exportXlsx() {
    const title = TABS.find(([k]) => k === tab)![1] === "كل الدعاوى" ? "كل الدعاوى" : tab === "active" ? "الدعاوى النشطة" : "الدعاوى المسلّمة للمحكمة";
    const data = buildXlsx({ header: xHeader, title, cols: CASE_COLS, rows: list.map((r, i) => [i + 1, ...r.x]), color: xColor });
    saveBlob(`${title.replace(/ /g, "_")}_${todayStr()}.xlsx`, new Blob([data], { type: XLSX_MIME }));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {TABS.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-full px-4 py-1.5 text-sm ${tab === k ? "bg-ink hover:bg-ink-hover text-white" : "border border-line bg-white"}`}
          >
            {l} <span className="opacity-70">({count(k)})</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="بحث: رقم، طرف، محامٍ، قاضٍ…"
          className="min-w-56 flex-1 rounded-lg border border-line bg-white px-3 py-2"
        />
        <button
          onClick={exportXlsx}
          disabled={!list.length}
          title="تنزيل الدعاوى المعروضة الآن (بعد البحث والفلاتر) في ملف Excel"
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm hover:border-brand disabled:opacity-50"
        >
          تصدير Excel
        </button>
        <select value={src} onChange={(e) => setSrc(e.target.value)} className="rounded-lg border border-line bg-white px-3 py-2">
          <option value="">كل جهات التكليف</option>
          {SRCS.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-background text-right text-muted">
            <tr>
              <th className="w-10 px-3 py-2 font-medium">#</th>
              <th className="w-[26%] px-3 py-2 font-medium">رقم الدعوى</th>
              <th className="px-3 py-2 font-medium">الأطراف</th>
              <th className="w-32 px-3 py-2 font-medium">الفريق</th>
              <th className="w-36 px-3 py-2 font-medium">حالة التقرير</th>
              {tab !== "delivered" && <th className="w-28 px-3 py-2 font-medium">الجلسة</th>}
            </tr>
          </thead>
          <tbody>
            {list.map((r, i) => (
              <tr
                key={r.id}
                title="انقر مرتين لفتح الدعوى"
                // a finger tap opens directly (double tap is awkward on phones); a mouse click only selects
                onClick={(e) => ((e.nativeEvent as PointerEvent).pointerType === "touch" ? open(r.id) : setSel(r.id))}
                onDoubleClick={() => open(r.id)}
                className={`cursor-pointer border-t border-line align-top ${sel === r.id ? "bg-brand-soft" : "hover:bg-background"}`}
              >
                <td className="px-3 py-3 text-muted">{i + 1}</td>
                <td className="px-3 py-3">
                  {r.caseNo ? (
                    <span className="font-semibold">
                      <span dir="ltr" className="inline-block">{r.caseNo}</span> {r.caseType}
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">بدون رقم بعد</span>
                  )}
                  {r.srcLabel && <span className={`mr-2 inline-block rounded-full px-2 py-0.5 text-[11px] ${SRC_TONE[r.src] ?? ""}`}>{r.srcLabel}</span>}
                </td>
                <td className="px-3 py-3 leading-6">
                  {r.p1 && <div>{r.p1}</div>}
                  {r.p1 && r.p2 && <div className="text-xs font-semibold text-muted">ضد</div>}
                  {r.p2 && <div>{r.p2}</div>}
                  {!r.p1 && !r.p2 && <span className="text-muted">—</span>}
                </td>
                <td className="px-3 py-3 text-muted">{r.team || "—"}</td>
                <td className="px-3 py-3">
                  {r.delivered ? (
                    <span className="text-green-700">تم التسليم{r.reportDate ? ` في ${r.reportDate}` : ""}</span>
                  ) : (
                    <span>قيد الإعداد</span>
                  )}
                </td>
                {tab !== "delivered" && (
                  <td className="px-3 py-3">
                    {r.delivered || !r.hearing ? (
                      <span className="text-muted">—</span>
                    ) : r.hearing.past ? (
                      <>
                        <div className="text-muted line-through">{r.hearing.date}</div>
                        <div className="text-xs text-amber-700">مضى عليها {days(r.hearing.days)}</div>
                      </>
                    ) : (
                      <>
                        <div className={r.hearing.days <= 7 ? "font-semibold text-red-700" : ""}>{r.hearing.date}</div>
                        <div className="text-xs text-muted">
                          {r.hearing.days === 0 ? "اليوم" : r.hearing.days === 1 ? "غداً" : `بعد ${days(r.hearing.days)}`}
                        </div>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-muted">
                  {rows.length ? "لا توجد دعاوى تطابق البحث." : "لا توجد دعاوى بعد. اضغط «+ دعوى جديدة»."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
