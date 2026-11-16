import { getCtx } from "@/lib/office";
import { listCases, sideOf, isDelivered } from "@/lib/cases";
import { normCaseNo, normRole } from "@/lib/format";
import ScheduleView, { type Item } from "./view";

// All meetings and inspections across the office's cases (hearings are listed too, as a separate filter,
// because the team prepares the report or a postponement letter before them).
export default async function SchedulePage() {
  const ctx = await getCtx();
  const cases = await listCases(ctx.officeId);
  const items: Item[] = cases.flatMap((c) =>
    c.events.map((e) => {
      const p1 = sideOf(c, 1)[0], p2 = sideOf(c, 2)[0];
      const who = e.invited === "1" ? p1 : e.invited === "2" ? p2 : null;
      return {
        id: e.id,
        caseId: c.id,
        type: e.type,
        date: e.date,
        time: e.time?.slice(0, 5) ?? "",
        place: e.place ?? "",
        note: e.note ?? "",
        caseNo: c.case_no ? `${normCaseNo(c.case_no)} ${c.case_type ?? ""}`.trim() : "بدون رقم بعد",
        parties: [p1?.name, p2?.name].filter(Boolean).join(" ضد "),
        invited: who ? `${normRole(who.role)}: ${who.name}` : "كل الأطراف",
        delivered: isDelivered(c),
      };
    })
  );
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">جدول المواعيد</h1>
      <ScheduleView items={items} />
    </div>
  );
}
