import Link from "next/link";
import { getCtx } from "@/lib/office";
import { loadBoard, caseLabel, sideOf, isDelivered } from "@/lib/cases";
import { caseAlerts, caseStage, STAGES, LEVEL_ORDER, type Stage } from "@/lib/alerts";
import { fmtD, inDays, dayDiff, todayStr, normCaseNo } from "@/lib/format";
import { AlertLine, DOT } from "@/components/alerts-ui";

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
  const { cases, lettersOf, snoozes } = await loadBoard(ctx.officeId);
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

  const stages = new Map<Stage, typeof active>(STAGES.map(([k]) => [k, []]));
  active.forEach((c) => stages.get(caseStage(c, lettersOf(c.id)))!.push(c));

  const tiles: [number, string, string?][] = [
    [active.length, "دعوى نشطة", "/cases"],
    [upcoming.filter((x) => x.e.type !== "جلسة" && dayDiff(x.e.date) <= 6).length, "موعد هذا الأسبوع", "/schedule"],
    [active.filter((c) => c.events.some((e) => e.type === "جلسة" && e.date >= t && dayDiff(e.date) <= 14)).length, "جلسة خلال 14 يوماً"],
    [active.reduce((n, c) => n + lettersOf(c.id).filter((l) => l.sent_at && (!l.reply_date || l.reply_type === "partial")).length, 0), "خطاب بانتظار الرد"],
    [active.filter((c) => c.deadline && c.deadline < t).length, "تجاوزت الموعد النهائي"],
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">مرحباً {ctx.displayName}</h1>
        <p className="text-muted">
          {wd(t)} {fmtD(t)} · {ctx.officeName}
        </p>
      </div>

      {/* hero: the next meeting or inspection */}
      <section className="grid gap-4 rounded-2xl bg-brand p-5 text-white md:grid-cols-[1.3fr_1fr]">
        <div>
          <div className="text-sm opacity-80">الموعد القادم</div>
          {nextVisit ? (
            <Link href={`/cases/${nextVisit.c.id}`} className="block">
              <div className="mt-1 text-2xl font-bold">
                {nextVisit.e.type} · {wd(nextVisit.e.date)} {fmtD(nextVisit.e.date)}
                {nextVisit.e.time ? ` · ${nextVisit.e.time.slice(0, 5)}` : ""}
              </div>
              <div className="mt-1 opacity-90">({inDays(nextVisit.e.date)}) · {label(nextVisit.c)}</div>
              <div className="text-sm opacity-80">
                {[sideOf(nextVisit.c, 1)[0]?.name, sideOf(nextVisit.c, 2)[0]?.name].filter(Boolean).join(" ضد ")}
                {nextVisit.e.place ? ` · ${nextVisit.e.place}` : ""}
              </div>
            </Link>
          ) : (
            <div className="mt-1 text-xl font-semibold opacity-90">لا توجد اجتماعات أو معاينات قادمة</div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3">
          {tiles.map(([n, l, href]) => {
            const body = (
              <>
                <div className="text-2xl font-bold">{n}</div>
                <div className="text-xs opacity-85">{l}</div>
              </>
            );
            return href ? (
              <Link key={l} href={href} className="rounded-xl bg-white/10 p-3 hover:bg-white/20">{body}</Link>
            ) : (
              <div key={l} className="rounded-xl bg-white/10 p-3">{body}</div>
            );
          })}
        </div>
      </section>

      {alerts.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">يحتاج انتباهك</h2>
          {alerts.slice(0, 8).map(({ a, c }) => (
            <div key={c.id + a.key}>
              <div className="mb-0.5 text-xs text-muted">{label(c)}</div>
              <AlertLine a={a} href={`/cases/${c.id}`} canWrite={ctx.role !== "viewer"} />
            </div>
          ))}
          {alerts.length > 8 && <p className="text-sm text-muted">و{alerts.length - 8} تنبيهات أخرى في الجرس 🔔</p>}
        </section>
      )}

      {/* 14-day calendar */}
      <section className="rounded-2xl border border-line bg-white p-4">
        <h2 className="mb-3 font-semibold">الأيام الـ14 القادمة</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {days.map(({ d, items }) => (
            <div key={d} className={`min-h-24 rounded-xl border p-2 ${d === t ? "border-brand bg-brand-soft/50" : "border-line"} ${["الجمعة", "السبت"].includes(wd(d)) ? "opacity-60" : ""}`}>
              <div className="text-xs font-semibold">{wd(d)}</div>
              <div className="mb-1 text-xs text-muted">{fmtD(d).slice(5)}</div>
              <div className="space-y-1">
                {items.map(({ c, e }) => (
                  <Link key={e.id} href={`/cases/${c.id}`} title={label(c)} className={`block truncate rounded-md px-1.5 py-0.5 text-[11px] ${TYPE_TONE[e.type]}`}>
                    {e.time ? e.time.slice(0, 5) + " " : ""}
                    {e.type}: {sideOf(c, 1)[0]?.name ?? label(c)}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* kanban: where each active case stands */}
      <section>
        <h2 className="mb-3 font-semibold">لوحة سير الدعاوى</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {STAGES.map(([k, title, sub]) => {
            const list = stages.get(k)!;
            if (k === "old" && !list.length) return null;
            return (
              <div key={k} className="rounded-2xl bg-white p-3 ring-1 ring-line">
                <div className="flex items-baseline gap-2">
                  <h3 className="flex-1 text-sm font-semibold">{title}</h3>
                  <span className="text-sm font-bold text-brand">{list.length}</span>
                </div>
                <div className="mb-2 text-xs text-muted">{sub}</div>
                <div className="space-y-2">
                  {list.map((c) => {
                    const al = caseAlerts(c, lettersOf(c.id), snoozes);
                    const worst = al.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level])[0];
                    return (
                      <Link key={c.id} href={`/cases/${c.id}`} className="block rounded-xl border border-line p-2 text-xs hover:border-brand">
                        <div className="flex items-start gap-1.5">
                          {worst && worst.level !== "calm" && <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${DOT[worst.level]}`} />}
                          <b className="leading-5">{label(c)}</b>
                        </div>
                        <div className="mt-0.5 truncate text-muted">{sideOf(c, 1)[0]?.name ?? ""}</div>
                      </Link>
                    );
                  })}
                  {!list.length && <div className="text-xs text-muted">—</div>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
