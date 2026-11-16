import { getCtx } from "@/lib/office";
import { listCases } from "@/lib/cases";
import { normCaseNo } from "@/lib/format";
import NewCase from "./new-case";

export default async function NewCasePage() {
  const ctx = await getCtx();
  const cases = await listCases(ctx.officeId);
  // for duplicate detection on import: case number + party names of existing cases
  const existing = cases.map((c) => ({
    id: c.id,
    caseNo: normCaseNo(c.case_no),
    label: `${c.case_no ? normCaseNo(c.case_no) + " " + (c.case_type ?? "") : "بدون رقم"} — ${c.parties.filter((p) => p.side !== 3).map((p) => p.name).slice(0, 2).join(" ضد ")}`,
    names: c.parties.map((p) => p.name),
  }));
  return (
    <div className="max-w-4xl space-y-5">
      <h1 className="text-2xl font-bold">دعوى جديدة</h1>
      <NewCase officeId={ctx.officeId} existing={existing} />
    </div>
  );
}
