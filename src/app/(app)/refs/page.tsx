import { getCtx } from "@/lib/office";
import { listRefs, listMembers, listCases } from "@/lib/cases";
import { getSettings } from "@/lib/settings";
import { refText } from "@/lib/refs";
import { normCaseNo } from "@/lib/format";
import RefsView, { type RefRow } from "./view";

export default async function RefsPage() {
  const ctx = await getCtx();
  const [refs, members, cases, settings] = await Promise.all([
    listRefs(ctx.officeId),
    listMembers(ctx.officeId),
    listCases(ctx.officeId),
    getSettings(ctx.officeId),
  ]);
  const caseLabel = new Map(
    cases.map((c) => [c.id, c.case_no ? `${normCaseNo(c.case_no)} ${c.case_type ?? ""}`.trim() : c.parties.map((p) => p.name).slice(0, 2).join(" ضد ")])
  );
  const nm = new Map(members.map((m) => [m.user_id, m.display_name]));
  const rows: RefRow[] = refs.map((r) => ({
    id: r.id,
    ref: refText(r, settings.refPrefix),
    year: r.year,
    seq: r.seq,
    category: r.category,
    title: r.title ?? "",
    caseId: r.case_id,
    caseLabel: r.case_id ? caseLabel.get(r.case_id) ?? "دعوى محذوفة" : "",
    date: r.issued_at,
    by: nm.get(r.issued_by ?? "") ?? "",
    cancelled: r.status === "ملغى",
  }));
  const caseOptions = cases.map((c) => ({ id: c.id, label: caseLabel.get(c.id) ?? "" }));
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">سجل الأرقام المرجعية</h1>
      <RefsView rows={rows} cases={caseOptions} canWrite={ctx.role !== "viewer"} />
    </div>
  );
}
