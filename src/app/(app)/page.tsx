import Link from "next/link";
import { getCtx } from "@/lib/office";
import { loadBoard, loadLifeExtra, caseLabel, sideOf, isDelivered, type Case } from "@/lib/cases";
import { caseAlerts, LEVEL_ORDER, type Alert } from "@/lib/alerts";
import { caseLife } from "@/lib/lifecycle";
import LifeBoard, { type LifeRow } from "./life-board";
import { fmtD, inDays, dayDiff, todayStr, normCaseNo } from "@/lib/format";
import { AlertLine } from "@/components/alerts-ui";

const WEEKDAY = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const wd = (d: string) => WEEKDAY[new Date(d + "T00:00:00Z").getUTCDay()];
const addDays = (d: string, n: number) => {
  const t = new Date(d + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};
const TYPE_TONE: Record<string, string> = { اجتماع: "bg-gold-soft text-gold", معاينة: "bg-emerald-50 text-emerald-800", جلسة: "bg-brand-soft text-brand" };

export default async function Home() {
  const ctx = await getCtx();
  const [{ cases, lettersOf, snoozes }, extraOf] = await Promise.all([loadBoard(ctx.officeId), loadLifeExtra(ctx.officeId)]);
  const t = todayStr();
  const active = cases.filter((c) => !isDelivered(c));
  const label = (c: (typeof cases)[number]) => caseLabel({ ...c, case_no: c.case_no ? normCaseNo(c.case_no) : null });

  const events = cases.flatMap((c) =>
    c.events.filter((e) => !(e.type === "جلسة" && isDelivered(c))).map((e) => ({ c, e }))
  );
  const upcoming = events.filter((x) => x.e.date >= t).sort((a, b) => (a.e.date + (a.e.time ?? "")).localeCompare(b.e.date + (b.e.time ?? "")));
  const nextVisit = upcoming.find((x) => x.e.type !== "جلسة");
  const days = Array.from({ length: 14 }, (_, i) => addDays(t, i)).map((d) => ({ d, items: upcoming.filter((x) => x.e.date === d) }));

  const alerts = active
    .flatMap((c) => caseAlerts(c, lettersOf(c.id), snoozes).map((a) => ({ a, c })))
    .filter((x) => x.a.level !== "calm")
    .sort((x, y) => LEVEL_ORDER[x.a.level] - LEVEL_ORDER[y.a.level]);

  // alerts grouped under their case, worst case first
  const byCase = new Map<string, { c: (typeof active)[number]; list: typeof alerts }>();
  alerts.forEach((x) => {
    if (!byCase.has(x.c.id)) byCase.set(x.c.id, { c: x.c, list: [] });
    byCase.get(x.c.id)!.list.push(x);
  });
  const alertGroups = [...byCase.values()];

  const lifeRows: LifeRow[] = active.map((c) => ({
    id: c.id,
    label: label(c),
    party: [sideOf(c, 1)[0]?.name, sideOf(c, 2)[0]?.name].filter(Boolean).join(" ضد "),
    ...caseLife(c, lettersOf(c.id), extraOf(c.id), snoozes),
  }));

  const tiles: [number, string, string?][] = [
    [active.length, "دعوى نشطة", "/cases"],
    [upcoming.filter((x) => x.e.type !== "جلسة" && dayDiff(x.e.date) <= 6).length, "موعد هذا الأسبوع", "/schedule"],
    [active.filter((c) => c.events.some((e) => e.type === "جلسة" && e.date >= t && dayDiff(e.date) <= 14)).length, "جلسة خلال 14 يوماً"],
    [active.reduce((n, c) => n + lettersOf(c.id).filter((l) => l.sent_at && (!l.reply_date || l.reply_type === "partial")).length, 0), "خطاب بانتظار الرد"],
    [active.filter((c) => c.deadline && c.deadline < t).length, "تجاوزت الموعد النهائي"],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">مرحباً {ctx.displayName}</h1>
        <p className="text-muted">
          {wd(t)} {fmtD(t)} · {ctx.officeName}
        </p>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0 space-y-6">
      {/* hero: the next meeting or inspection */}
      <section className="grid gap-4 rounded-2xl border border-line border-s-4 border-s-brand bg-white p-5 md:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="text-sm text-muted">الموعد القادم</div>
          {nextVisit ? (
            <Link href={`/cases/${nextVisit.c.id}`} className="block">
              <div className="mt-1 font-display text-2xl font-bold text-brand">
                {nextVisit.e.type} · {wd(nextVisit.e.date)} {fmtD(nextVisit.e.date)}
                {nextVisit.e.time ? ` · ${nextVisit.e.time.slice(0, 5)}` : ""}
              </div>
              <div className="mt-1">({inDays(nextVisit.e.date)}) · {label(nextVisit.c)}</div>
              <div className="text-sm text-muted">
                {[sideOf(nextVisit.c, 1)[0]?.name, sideOf(nextVisit.c, 2)[0]?.name].filter(Boolean).join(" ضد ")}
                {nextVisit.e.place ? ` · ${nextVisit.e.place}` : ""}
              </div>
            </Link>
          ) : (
            <div className="mt-1 text-xl font-semibold text-muted">لا توجد اجتماعات أو معاينات قادمة</div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">
          {tiles.map(([n, l, href]) => {
            const body = (
              <>
                <div className="text-2xl font-bold">{n}</div>
                <div className="text-xs text-muted">{l}</div>
              </>
            );
            return href ? (
              <Link key={l} href={href} className="rounded-xl border border-line bg-background p-3 hover:border-gold/50">{body}</Link>
            ) : (
              <div key={l} className="rounded-xl border border-line bg-background p-3">{body}</div>
            );
          })}
        </div>
      </section>

      {alertGroups.length > 0 && (
        <section className="rounded-2xl border border-line bg-white p-4">
          <h2 className="mb-2 flex items-baseline gap-2 font-semibold">
            يحتاج انتباهك <span className="text-sm font-normal text-muted">({alerts.length})</span>
          </h2>
          <AlertGroups groups={alertGroups.slice(0, 5)} label={label} canWrite={ctx.role !== "viewer"} />
          {alertGroups.length > 5 && (
            <details className="group">
              <summary className="cursor-pointer list-none pt-2 text-sm font-semibold text-brand hover:underline">
                <span className="group-open:hidden">عرض الكل ({alertGroups.length - 5} دعاوى أخرى)</span>
                <span className="hidden group-open:inline">إخفاء</span>
              </summary>
              <AlertGroups groups={alertGroups.slice(5)} label={label} canWrite={ctx.role !== "viewer"} />
            </details>
          )}
        </section>
      )}
      </div>

      {/* next 14 days as an agenda (only days that have something) */}
      <aside className="rounded-2xl border border-line bg-white p-4 xl:sticky xl:top-20">
        <h2 className="mb-3 font-semibold">الأيام الـ14 القادمة</h2>
        {days.every((x) => !x.items.length) && <p className="text-sm text-muted">لا مواعيد خلال الأسبوعين القادمين.</p>}
        <div className="space-y-3">
          {days
            .filter((x) => x.items.length)
            .map(({ d, items }) => (
              <div key={d}>
                <div className={`mb-1 text-xs font-semibold ${d === t ? "text-brand" : "text-muted"}`}>
                  {d === t ? "اليوم · " : ""}
                  {wd(d)} {fmtD(d)}
                </div>
                <div className="space-y-1">
                  {items.map(({ c, e }) => (
                    <Link key={e.id} href={`/cases/${c.id}`} className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-background">
                      <span className={`mt-0.5 shrink-0 rounded-md px-1.5 text-[11px] ${TYPE_TONE[e.type] ?? "bg-background"}`}>{e.type}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{sideOf(c, 1)[0]?.name ?? label(c)}</span>
                        <span className="block truncate text-xs text-muted">{label(c)}</span>
                      </span>
                      {e.time && <span className="shrink-0 text-xs tabular-nums text-muted">{e.time.slice(0, 5)}</span>}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </aside>
      </div>

      <LifeBoard rows={lifeRows} />
    </div>
  );
}

function AlertGroups({ groups, label, canWrite }: { groups: { c: Case; list: { a: Alert }[] }[]; label: (c: Case) => string; canWrite: boolean }) {
  return (
    <div className="divide-y divide-line">
      {groups.map(({ c, list }) => (
        <div key={c.id} className="py-2.5">
          <Link href={`/cases/${c.id}`} className="text-sm font-semibold hover:text-brand">
            {label(c)}
          </Link>
          <div className="ps-1">
            {list.map(({ a }) => (
              <AlertLine key={a.key} a={a} href={`/cases/${c.id}`} canWrite={canWrite} plain />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
