import Link from "next/link";
import { getCtx } from "@/lib/office";
import { listCases, listMembers, isDelivered, nextHearing, lastHearing, sideOf } from "@/lib/cases";
import { normCaseNo, srcOf, srcLabel, fmtD, dayDiff, normRole } from "@/lib/format";
import CasesTable, { type Row } from "./table";

export default async function CasesPage() {
  const ctx = await getCtx();
  const [cases, members] = await Promise.all([listCases(ctx.officeId), listMembers(ctx.officeId)]);
  const name = new Map(members.map((m) => [m.user_id, m.short_name || m.display_name]));

  const rows: Row[] = cases.map((c) => {
    const nh = nextHearing(c);
    const lh = nh ? null : lastHearing(c);
    const side = (k: 1 | 2) => {
      const ps = sideOf(c, k);
      return ps.length ? `${normRole(ps[0].role)}: ${ps.map((p) => p.name).join("، ")}` : "";
    };
    return {
      id: c.id,
      caseNo: normCaseNo(c.case_no),
      caseType: c.case_type ?? "",
      src: srcOf(c),
      srcLabel: srcLabel(srcOf(c)),
      p1: side(1),
      p2: side(2),
      team: [...new Set(c.case_team.map((t) => name.get(t.user_id) ?? ""))].filter(Boolean).join(" · "),
      delivered: isDelivered(c),
      reportDate: c.report_date ? fmtD(c.report_date) : "",
      hearing: nh ? { date: fmtD(nh.date), days: dayDiff(nh.date), past: false } : lh ? { date: fmtD(lh.date), days: dayDiff(lh.date), past: true } : null,
      search: [c.case_no, c.case_type, c.authority, c.circuit, c.judge, ...c.parties.flatMap((p) => [p.name, p.lawyer])].join(" "),
    };
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold">الدعاوى</h1>
        {ctx.role !== "viewer" && (
          <Link href="/cases/new" className="rounded-lg bg-brand px-4 py-2 font-semibold text-white">
            + دعوى جديدة
          </Link>
        )}
      </div>
      <CasesTable rows={rows} />
    </div>
  );
}
