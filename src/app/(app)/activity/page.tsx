import Link from "next/link";
import { getCtx } from "@/lib/office";
import { createClient } from "@/lib/supabase/server";
import { listMembers } from "@/lib/cases";
import { fmtD } from "@/lib/format";

type Row = { id: number; actor: string | null; action: string; case_id: string | null; case_label: string | null; detail: Record<string, unknown> | null; created_at: string };

// Append-only: nobody (not even the admin) can edit or delete these lines — enforced in the database.
export default async function ActivityPage() {
  const ctx = await getCtx();
  const supabase = await createClient();
  const [{ data }, members] = await Promise.all([
    supabase.from("activity").select("*").eq("office_id", ctx.officeId).order("created_at", { ascending: false }).limit(300),
    listMembers(ctx.officeId),
  ]);
  const nm = new Map(members.map((m) => [m.user_id, m.display_name]));
  const rows = (data ?? []) as Row[];
  const time = (s: string) => new Date(s).toLocaleTimeString("en-GB", { timeZone: "Asia/Qatar", hour: "2-digit", minute: "2-digit" });
  const day = (s: string) => new Date(new Date(s).getTime() + 3 * 3600_000).toISOString().slice(0, 10);
  const groups = new Map<string, Row[]>();
  rows.forEach((r) => groups.set(day(r.created_at), [...(groups.get(day(r.created_at)) ?? []), r]));
  const extra = (d: Row["detail"]) =>
    d ? [d.ref, d.name, d.email, d.date, d.due].filter((x) => typeof x === "string" && x).join(" · ") : "";

  return (
    <div className="max-w-4xl space-y-5">
      <h1 className="text-2xl font-bold">سجل النشاط</h1>
      <p className="text-sm text-muted">آخر 300 عملية. السجل للإضافة فقط ولا يمكن تعديله أو حذفه.</p>
      {!rows.length && <div className="rounded-xl border border-line bg-white p-8 text-center text-muted">لا يوجد نشاط بعد.</div>}
      {[...groups.entries()].map(([d, list]) => (
        <section key={d} className="rounded-xl border border-line bg-white">
          <h2 className="border-b border-line px-4 py-2 text-sm font-semibold">{fmtD(d)}</h2>
          <ul>
            {list.map((r) => (
              <li key={r.id} className="grid gap-1 border-b border-line px-4 py-2 text-sm last:border-0 sm:grid-cols-[3.5rem_9rem_1fr]">
                <span className="text-muted" dir="ltr">{time(r.created_at)}</span>
                <span className="font-semibold">{nm.get(r.actor ?? "") ?? "—"}</span>
                <span>
                  {r.action}
                  {extra(r.detail) && <span className="text-muted"> · {extra(r.detail)}</span>}
                  {r.case_id && (
                    <Link href={`/cases/${r.case_id}`} className="mr-2 text-xs text-brand hover:underline">
                      {r.case_label || "فتح الدعوى"}
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
