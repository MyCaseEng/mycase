"use client";
import { useActionState, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { REG_CATS } from "@/lib/refs";
import { fmtD } from "@/lib/format";
import Confirm2 from "@/components/confirm2";
import { issueFromForm, setRefStatus, type IssueRes } from "./actions";

export type RefRow = {
  id: string;
  ref: string;
  year: number;
  seq: number;
  category: string;
  title: string;
  caseId: string | null;
  caseLabel: string;
  date: string;
  by: string;
  cancelled: boolean;
};

export default function RefsView({ rows, cases, canWrite }: { rows: RefRow[]; cases: { id: string; label: string }[]; canWrite: boolean }) {
  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => b - a);
  const [year, setYear] = useState<number | "">(years[0] ?? "");
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [res, action, pending] = useActionState<IssueRes, FormData>(issueFromForm, null);
  const [, start] = useTransition();
  const list = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!year || r.year === year) &&
          (!cat || r.category === cat) &&
          (!q || [r.ref, r.title, r.caseLabel, r.category].join(" ").includes(q.trim()))
      ),
    [rows, year, cat, q]
  );
  return (
    <div className="space-y-4">
      {canWrite && (
        <form action={action} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-4">
          <b className="text-sm">إصدار رقم جديد:</b>
          <select name="category" className="rounded-lg border border-line px-3 py-2 text-sm">
            {REG_CATS.map(([k]) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <select name="case_id" className="max-w-64 rounded-lg border border-line px-3 py-2 text-sm">
            <option value="">بدون دعوى</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <input name="title" placeholder="وصف المستند" className="min-w-48 flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
          <button disabled={pending} className="rounded-lg bg-ink hover:bg-ink-hover px-4 py-2 text-sm font-semibold text-white">
            إصدار
          </button>
          {res && <span className={`w-full text-sm ${res.ok ? "font-semibold text-green-700" : "text-red-700"}`}>{res.text}</span>}
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        <select value={year} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")} className="rounded-lg border border-line bg-white px-3 py-2">
          <option value="">كل السنوات</option>
          {years.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-lg border border-line bg-white px-3 py-2">
          <option value="">كل الأنواع</option>
          {REG_CATS.map(([k]) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث" className="min-w-48 flex-1 rounded-lg border border-line bg-white px-3 py-2" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-background text-right text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">الرقم المرجعي</th>
              <th className="px-3 py-2 font-medium">المستند</th>
              <th className="px-3 py-2 font-medium">الدعوى</th>
              <th className="px-3 py-2 font-medium">التاريخ</th>
              <th className="px-3 py-2 font-medium">أصدره</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} className={`border-t border-line ${r.cancelled ? "text-muted" : ""}`}>
                <td className={`px-3 py-2 font-semibold ${r.cancelled ? "line-through" : ""}`} dir="ltr" style={{ textAlign: "right" }}>
                  {r.ref}
                </td>
                <td className="px-3 py-2">
                  {r.title || r.category}
                  {r.cancelled && <span className="mr-2 rounded bg-red-50 px-1.5 text-xs text-red-700">ملغى</span>}
                </td>
                <td className="px-3 py-2">{r.caseId ? <Link href={`/cases/${r.caseId}`} className="text-brand hover:underline">{r.caseLabel}</Link> : "—"}</td>
                <td className="px-3 py-2">{fmtD(r.date)}</td>
                <td className="px-3 py-2 text-muted">{r.by}</td>
                <td className="px-3 py-2 text-left">
                  {canWrite &&
                    (r.cancelled ? (
                      <button onClick={() => start(() => setRefStatus(r.id, false, r.caseId))} className="text-xs text-muted hover:text-brand">
                        إعادة تفعيل
                      </button>
                    ) : (
                      <Confirm2 label="إلغاء" confirmLabel="تأكيد الإلغاء" onConfirm={() => start(() => setRefStatus(r.id, true, r.caseId))} />
                    ))}
                </td>
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-muted">
                  لا توجد أرقام بعد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">الرقم الذي يصدر لا يُحذف ولا يُعاد استخدامه؛ يمكن إلغاؤه فقط ويبقى أثره في السجل.</p>
    </div>
  );
}
