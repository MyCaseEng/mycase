"use client";
import { useActionState, useTransition } from "react";
import type { Case, Member } from "@/lib/cases";
import { REG_CATS, refText, showRef, type Ref } from "@/lib/refs";
import { fmtD } from "@/lib/format";
import Confirm2 from "@/components/confirm2";
import { issueFromForm, setRefStatus, type IssueRes } from "../../refs/actions";

const panel = "rounded-2xl border border-line bg-white p-5";

// Every reference number issued for this case: minutes, letters, reports.
export default function ArchivePanel({ c, refs, members, prefix, canWrite }: { c: Case; refs: Ref[]; members: Member[]; prefix: string; canWrite: boolean }) {
  const [res, action, pending] = useActionState<IssueRes, FormData>(issueFromForm, null);
  const [, start] = useTransition();
  const nm = (id: string | null) => members.find((m) => m.user_id === id)?.display_name ?? "";
  return (
    <section className={panel}>
      <h2 className="mb-3 font-semibold">أرشيف الدعوى</h2>
      {!refs.length ? (
        <p className="mb-3 text-sm text-muted">لم يصدر أي رقم مرجعي لهذه الدعوى بعد.</p>
      ) : (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-right text-muted">
              <tr>
                <th className="py-1 font-medium">الرقم المرجعي</th>
                <th className="py-1 font-medium">المستند</th>
                <th className="py-1 font-medium">التاريخ</th>
                <th className="py-1 font-medium">أصدره</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {refs.map((r) => (
                <tr key={r.id} className={`border-t border-line ${r.status === "ملغى" ? "text-muted line-through" : ""}`}>
                  <td className="py-2 font-semibold">{showRef(refText(r, prefix))}</td>
                  <td className="py-2">{r.title || r.category}</td>
                  <td className="py-2">{fmtD(r.issued_at)}</td>
                  <td className="py-2 text-muted">{nm(r.issued_by)}</td>
                  <td className="py-2 text-left no-underline">
                    {canWrite &&
                      (r.status === "ملغى" ? (
                        <button onClick={() => start(() => setRefStatus(r.id, false, c.id))} className="text-xs text-muted hover:text-brand">
                          إعادة تفعيل
                        </button>
                      ) : (
                        <Confirm2 label="إلغاء" confirmLabel="تأكيد الإلغاء" onConfirm={() => start(() => setRefStatus(r.id, true, c.id))} />
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {canWrite && (
        <form action={action} className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <input type="hidden" name="case_id" value={c.id} />
          <select name="category" className="rounded-lg border border-line px-3 py-2 text-sm">
            {REG_CATS.map(([k]) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <input name="title" placeholder="وصف اختياري (مثل: محضر الاجتماع مع المدعية)" className="min-w-56 flex-1 rounded-lg border border-line px-3 py-2 text-sm" />
          <button disabled={pending} className="rounded-lg bg-ink hover:bg-ink-hover px-4 py-2 text-sm font-semibold text-white">
            إصدار رقم
          </button>
          {res && <span className={`text-sm ${res.ok ? "font-semibold text-green-700" : "text-red-700"}`}>{res.text}</span>}
        </form>
      )}
    </section>
  );
}
