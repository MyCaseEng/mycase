import Link from "next/link";
import { getCtx } from "@/lib/office";
import { listCases, listMembers, isDelivered, nextHearing, lastHearing, sideOf, getOfficeInfo, paidOf } from "@/lib/cases";
import { arTime } from "@/lib/docs";
import { countryName, themeOf } from "@/lib/countries";
import { normCaseNo, srcOf, srcLabel, fmtD, dayDiff, normRole, todayStr } from "@/lib/format";
import CasesTable, { type Row } from "./table";

export default async function CasesPage() {
  const ctx = await getCtx();
  const [cases, members, office] = await Promise.all([listCases(ctx.officeId), listMembers(ctx.officeId), getOfficeInfo(ctx.officeId)]);
  const t = todayStr();
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
      sample: c.is_sample,
      hearing: nh ? { date: fmtD(nh.date), days: dayDiff(nh.date), past: false } : lh ? { date: fmtD(lh.date), days: dayDiff(lh.date), past: true } : null,
      // the full record for the Excel export (same columns as the first platform)
      x: (() => {
        const P = (k: 1 | 2, f: (p: (typeof c.parties)[number]) => string) => sideOf(c, k).map(f).filter(Boolean).join("\n");
        const ne = [...c.events].filter((e) => e.date >= t).sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))[0];
        const d = (v?: string | null) => (v ? fmtD(v) : "");
        const n = (v?: number | null) => (v == null ? "" : Number(v));
        const who = (duty: string) => c.case_team.filter((m) => m.duty === duty).map((m) => name.get(m.user_id) ?? "").filter(Boolean).join("، ");
        return [
          normCaseNo(c.case_no), c.case_type ?? "", c.authority ?? "", c.category ?? "", srcLabel(srcOf(c)), c.circuit ?? "", c.judge ?? "", c.secretary ?? "",
          P(1, (p) => `${normRole(p.role)}: ${p.name}${p.phone ? " — هاتف " + p.phone : ""}`),
          P(1, (p) => (p.lawyer ? p.lawyer + (p.lawyer_phone ? " — هاتف " + p.lawyer_phone : "") : "")),
          P(2, (p) => `${normRole(p.role)}: ${p.name}${p.phone ? " — هاتف " + p.phone : ""}`),
          P(2, (p) => (p.lawyer ? p.lawyer + (p.lawyer_phone ? " — هاتف " + p.lawyer_phone : "") : "")),
          d(c.received), d(c.prelim_date), ne ? `${ne.type} ${fmtD(ne.date)}${ne.time ? " " + arTime(ne.time) : ""}` : "", d(c.deadline),
          isDelivered(c) ? "تم التسليم" : c.status, [who("coordinator"), who("executor")].filter(Boolean).join(" / "), d(c.report_date),
          n(c.deposit_ordered), n(c.claim_value), n(c.project_value),
          c.pays ? paidOf(c, "deposit") : "", c.pays ? paidOf(c, "fee") || "" : "",
        ];
      })(),
      search: [c.case_no, c.case_type, c.authority, c.circuit, c.judge, ...c.parties.flatMap((p) => [p.name, p.lawyer])].join(" "),
    };
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold">الدعاوى</h1>
        {ctx.role !== "viewer" && (
          <Link href="/cases/new" className="rounded-lg bg-ink hover:bg-ink-hover px-4 py-2 font-semibold text-white">
            + دعوى جديدة
          </Link>
        )}
      </div>
      <CasesTable
        rows={rows}
        xHeader={[ctx.officeName, office.expertName, countryName(office.country)].filter(Boolean).join(" — ")}
        xColor={themeOf(office.country).brand.slice(1)}
      />
    </div>
  );
}
