import { getCtx } from "@/lib/office";
import { listCases, listLetters, listProcRows, isDelivered, listBundle } from "@/lib/cases";
import { normCaseNo } from "@/lib/format";
import ProcView from "./view";

export default async function ProceduresPage({ searchParams }: PageProps<"/procedures">) {
  const ctx = await getCtx();
  const sp = await searchParams;
  const cases = await listCases(ctx.officeId);
  const sorted = cases.slice().sort((a, b) => Number(isDelivered(a)) - Number(isDelivered(b)));
  const wanted = typeof sp.case === "string" ? sp.case : "";
  const c = sorted.find((x) => x.id === wanted) ?? sorted.find((x) => !isDelivered(x)) ?? sorted[0];
  const options = sorted.map((x) => ({
    id: x.id,
    label: `${x.case_no ? `${normCaseNo(x.case_no)} ${x.case_type ?? ""}` : "بدون رقم"} — ${x.parties.filter((p) => p.side !== 3).map((p) => p.name).slice(0, 2).join(" ضد ")}${isDelivered(x) ? " (مسلّمة)" : ""}`,
  }));
  if (!c)
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold">إجراءات المأمورية</h1>
        <p className="text-muted">لا توجد دعاوى بعد.</p>
      </div>
    );
  const [letters, rows, bundle] = await Promise.all([listLetters(c.id), listProcRows(c.id), listBundle(c.id)]);
  return <ProcView c={c} letters={letters} rows={rows} bundle={bundle?.items ?? []} options={options} canWrite={ctx.role !== "viewer"} />;
}
