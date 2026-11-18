import Link from "next/link";
import { getCtx } from "@/lib/office";
import { loadBoard, loadLifeExtra, loadStartFacts, caseLabel, sideOf, isDelivered, type Case } from "@/lib/cases";
import { caseAlerts, type Alert } from "@/lib/alerts";
import { caseLife } from "@/lib/lifecycle";
import LifeBoard, { type LifeRow } from "./life-board";
import StartHere, { type StartStep } from "./start-here";
import { fmtD, inDays, dayDiff, todayStr, normCaseNo, days as days_ } from "@/lib/format";
import { AlertLine } from "@/components/alerts-ui";

const WEEKDAY = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const wd = (d: string) => WEEKDAY[new Date(d + "T00:00:00Z").getUTCDay()];
const addDays = (d: string, n: number) => {
  const t = new Date(d + "T00:00:00Z");
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};
const TYPE_TONE: Record<string, string> = { اجتماع: "bg-gold-soft text-gold", معاينة: "bg-emerald-50 text-emerald-800", جلسة: "bg-brand-soft text-brand" };

const isReplyKey = (k: string) => k.startsWith("qlate|") || k.startsWith("qdue|");

// Home is a work board: what is late, what needs attention, which replies have not come,
// and what is coming in the next 14 days. Each line has its action; when the work is done the line goes away.
export default async function Home() {
  const ctx = await getCtx();
  const [{ cases, lettersOf, snoozes }, extraOf, facts] = await Promise.all([loadBoard(ctx.officeId), loadLifeExtra(ctx.officeId), loadStartFacts(ctx.officeId)]);
  const t = todayStr();
  const canWrite = ctx.role !== "viewer";
  const active = cases.filter((c) => !isDelivered(c));
  const label = (c: (typeof cases)[number]) => caseLabel({ ...c, case_no: c.case_no ? normCaseNo(c.case_no) : null });
  const party = (c: Case, id: string | null) => c.parties.find((p) => p.id === id)?.name ?? "الطرف";

  // the next 14 days: appointments, hearings and report deadlines
  type Item = { key: string; c: Case; date: string; time: string | null; type: string; place: string | null };
  const items: Item[] = [
    ...cases.flatMap((c) =>
      c.events.filter((e) => e.date >= t && !(e.type === "جلسة" && isDelivered(c))).map((e) => ({ key: e.id, c, date: e.date, time: e.time, type: e.type, place: e.place ?? null }))
    ),
    ...active.filter((c) => c.deadline && c.deadline >= t).map((c) => ({ key: `dl-${c.id}`, c, date: c.deadline!, time: null, type: "إيداع التقرير", place: null })),
  ].sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")));
  const days = Array.from({ length: 14 }, (_, i) => addDays(t, i)).map((d) => ({ d, items: items.filter((x) => x.date === d) }));

  const alerts = active.flatMap((c) => caseAlerts(c, lettersOf(c.id), snoozes).map((a) => ({ a, c }))).filter((x) => !isReplyKey(x.a.key));
  const group = (list: typeof alerts) => {
    const m = new Map<string, { c: Case; list: typeof alerts }>();
    list.forEach((x) => {
      if (!m.has(x.c.id)) m.set(x.c.id, { c: x.c, list: [] });
      m.get(x.c.id)!.list.push(x);
    });
    return [...m.values()];
  };
  const late = group(alerts.filter((x) => x.a.level === "red"));
  const watch = group(alerts.filter((x) => x.a.level === "amber"));

  // replies that have not come: sent question letters without a full reply, the late ones first
  const waiting = active
    .flatMap((c) => lettersOf(c.id).filter((l) => l.sent_at && l.reply_type !== "full").map((l) => ({ c, l, dd: l.due ? dayDiff(l.due) : null })))
    .sort((a, b) => (a.dd ?? 999) - (b.dd ?? 999));

  const sample = cases.find((c) => c.is_sample);
  const start: StartStep[] = [
    { key: "office", label: "أنشئ مكتبك", href: "/settings", guide: "home", done: true },
    { key: "sample", label: "افتح الدعوى النموذجية وتجوّل فيها", href: sample ? `/cases/${sample.id}` : "/cases", guide: "home", done: sample ? "local" : true },
    { key: "case", label: "أضف أول دعوى حقيقية", href: "/cases/new", guide: "cases", done: cases.some((c) => !c.is_sample) },
    ...(ctx.realRole === "admin" ? [{ key: "team", label: "أضف فريقك", href: "/team", guide: "team", done: facts.members > 1 } as StartStep] : []),
    { key: "ref", label: "أصدر أول رقم مرجعي", href: "/refs", guide: "refs", done: facts.refs > 0 },
    { key: "doc", label: "ولّد أول محضر أو خطاب Word", href: sample ? `/cases/${sample.id}` : "/cases", guide: "docs", done: "local" },
  ];

  const lifeRows: LifeRow[] = active.map((c) => ({
    id: c.id,
    label: label(c),
    party: [sideOf(c, 1)[0]?.name, sideOf(c, 2)[0]?.name].filter(Boolean).join(" ضد "),
    ...caseLife(c, lettersOf(c.id), extraOf(c.id), snoozes),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">مرحباً {ctx.displayName}</h1>
        <p className="text-muted">
          {wd(t)} {fmtD(t)} · {ctx.officeName} · {active.length} دعوى قيد العمل
        </p>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-5">
          {ctx.officeAgeDays < 30 && <StartHere steps={start} />}
          <Board tone="red" title="متأخر — ابدأ به" count={late.reduce((n, g) => n + g.list.length, 0)} empty="لا شيء متأخر.">
            <AlertGroups groups={late} label={label} canWrite={canWrite} />
          </Board>

          <Board tone="amber" title="الردود التي لم تصل" count={waiting.length} empty="كل الخطابات المرسلة وصلت ردودها.">
            <div className="divide-y divide-line">
              {waiting.map(({ c, l, dd }) => (
                <div key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dd !== null && dd < 0 ? "bg-red-600" : dd !== null && dd <= 1 ? "bg-amber-500" : "bg-slate-300"}`} />
                  <Link href={`/cases/${c.id}`} className="w-40 shrink-0 truncate font-semibold hover:text-brand">{label(c)}</Link>
                  <span className="min-w-40 flex-1">
                    {party(c, l.party_id)}
                    {l.reply_type === "partial" && <span className="text-muted"> · رد جزئي</span>}
                  </span>
                  <span className={`text-xs ${dd !== null && dd < 0 ? "font-semibold text-red-700" : "text-muted"}`}>
                    {dd === null ? "بلا مهلة" : dd < 0 ? `متأخر ${days_(dd)}` : dd === 0 ? "تنتهي المهلة اليوم" : `تنتهي ${inDays(l.due!)}`}
                  </span>
                  <Link href={`/cases/${c.id}#questions`} className="rounded-md border border-line bg-white px-2 py-0.5 text-xs hover:border-brand">
                    {dd !== null && dd < 0 ? "تسجيل الرد أو التمديد" : "تسجيل الرد"}
                  </Link>
                </div>
              ))}
            </div>
          </Board>

          <Board tone="gold" title="يحتاج انتباهك" count={watch.reduce((n, g) => n + g.list.length, 0)} empty="لا تنبيهات.">
            <AlertGroups groups={watch} label={label} canWrite={canWrite} />
          </Board>

        </div>

        {/* next 14 days as an agenda (only days that have something) */}
        <aside className="rounded-2xl border border-line bg-white p-4 xl:sticky xl:top-20">
          <h2 className="mb-3 font-semibold">المواعيد القادمة · 14 يومًا</h2>
          {days.every((x) => !x.items.length) && <p className="text-sm text-muted">لا مواعيد خلال الأسبوعين القادمين.</p>}
          <div className="space-y-3">
            {days
              .filter((x) => x.items.length)
              .map(({ d, items }) => (
                <div key={d}>
                  <div className={`mb-1 text-xs font-semibold ${d === t ? "text-brand" : "text-muted"}`}>
                    {d === t ? "اليوم · " : d === addDays(t, 1) ? "غدًا · " : ""}
                    {wd(d)} {fmtD(d)}
                  </div>
                  <div className="space-y-1">
                    {items.map((x) => (
                      <Link key={x.key} href={`/cases/${x.c.id}`} className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-background">
                        <span className={`mt-0.5 shrink-0 rounded-md px-1.5 text-[11px] ${TYPE_TONE[x.type] ?? "bg-red-50 text-red-800"}`}>{x.type}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{sideOf(x.c, 1)[0]?.name ?? label(x.c)}</span>
                          <span className="block truncate text-xs text-muted">
                            {label(x.c)}
                            {x.place ? ` · ${x.place}` : ""}
                          </span>
                        </span>
                        {x.time && <span className="shrink-0 text-xs tabular-nums text-muted">{x.time.slice(0, 5)}</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </aside>
      </div>

      <details className="group rounded-2xl border border-line bg-white">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-semibold">
          <span className="text-muted transition group-open:rotate-90">◀</span>
          دورة حياة الدعاوى
          <span className="text-sm font-normal text-muted">· أين وصلت كل دعوى</span>
        </summary>
        <div className="border-t border-line">
          <LifeBoard rows={lifeRows} bare />
        </div>
      </details>
    </div>
  );
}

const BOARD_TONE: Record<string, string> = {
  red: "border-s-red-600",
  amber: "border-s-amber-500",
  gold: "border-s-gold",
};
const COUNT_TONE: Record<string, string> = {
  red: "bg-red-50 text-red-800",
  amber: "bg-amber-50 text-amber-800",
  gold: "bg-gold-soft text-gold",
};

function Board({ tone, title, count, empty, children }: { tone: string; title: string; count: number; empty: string; children: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border border-s-4 border-line bg-white p-4 ${count ? BOARD_TONE[tone] : "border-s-emerald-500"}`}>
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        {title}
        <span className={`rounded-full px-2 py-0.5 text-xs ${count ? COUNT_TONE[tone] : "bg-emerald-50 text-emerald-800"}`}>{count}</span>
      </h2>
      {count ? children : <p className="py-1 text-sm text-emerald-700">✓ {empty}</p>}
    </section>
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
