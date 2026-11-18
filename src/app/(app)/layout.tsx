import { Suspense } from "react";
import { redirect } from "next/navigation";
import Shell from "./shell";
import { getCtx, ROLE_LABEL } from "@/lib/office";
import { GRACE_DAYS } from "@/lib/subscription";
import { createClient } from "@/lib/supabase/server";
import { loadBoard, caseLabel, getOfficeInfo } from "@/lib/cases";
import Letterhead from "@/components/letterhead";
import { themeVars } from "@/lib/countries";
import { caseAlerts, LEVEL_ORDER } from "@/lib/alerts";
import { normCaseNo, fmtD, days } from "@/lib/format";
import { Bell, type CaseAlerts } from "@/components/alerts-ui";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// The session is read at request time, so the signed-in shell streams in behind a Suspense boundary
// (required by Cache Components: request data outside Suspense is a build error).
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center p-10 text-muted">جارٍ التحميل…</div>}>
      <SignedIn>{children}</SignedIn>
    </Suspense>
  );
}

async function SignedIn({ children }: { children: React.ReactNode }) {
  const ctx = await getCtx();
  const supabase = await createClient();
  const [{ cases, lettersOf, snoozes }, info, { data: owner }] = await Promise.all([
    loadBoard(ctx.officeId),
    getOfficeInfo(ctx.officeId),
    supabase.rpc("is_platform_admin"),
  ]);
  const groups: CaseAlerts[] = cases
    .map((c) => ({
      caseId: c.id,
      label: caseLabel({ ...c, case_no: c.case_no ? normCaseNo(c.case_no) : null }),
      alerts: caseAlerts(c, lettersOf(c.id), snoozes).sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]),
    }))
    .filter((g) => g.alerts.length)
    .sort((a, b) => LEVEL_ORDER[a.alerts[0].level] - LEVEL_ORDER[b.alerts[0].level]);
  return (
    <Shell officeName={ctx.officeName} user={{ name: ctx.displayName, role: ROLE_LABEL[ctx.realRole] }} signOut={signOut} bell={<Bell groups={groups} />}
      theme={themeVars(info.country)}
      owner={owner === true}
      letterhead={<Letterhead officeName={ctx.officeName} expertName={info.expertName} country={info.country} specialty={info.specialty} />}
    >
      <SubBanner ctx={ctx} />
      {children}
    </Shell>
  );
}

// Subscription notice: a warning to the expert before the end, then grace and read-only notices to everyone.
function SubBanner({ ctx }: { ctx: Awaited<ReturnType<typeof getCtx>> }) {
  const s = ctx.sub;
  if (!s || s.phase === "ok" || (s.phase === "warn" && ctx.realRole !== "admin")) return null;
  const end = fmtD(s.end);
  const left = s.phase === "warn" ? s.daysLeft : GRACE_DAYS + s.daysLeft + 1;
  const tone = s.phase === "locked" ? "border-red-300 bg-red-50 text-red-900" : s.phase === "grace" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-blue-200 bg-blue-50 text-blue-900";
  const text =
    s.phase === "warn"
      ? `${s.trial ? "تنتهي الفترة التجريبية" : "ينتهي اشتراك المكتب"} ${s.daysLeft === 0 ? "اليوم" : `بعد ${days(s.daysLeft)}`} (${end}). للاشتراك أو التجديد راسلنا عبر زر «الدعم».`
      : s.phase === "grace"
        ? `انتهى ${s.trial ? "التجربة المجانية" : "اشتراك المكتب"} في ${end}. يبقى العمل متاحًا بالكامل ${days(left)} أخرى، ثم تصبح المنصة للقراءة فقط حتى التجديد. راسلنا عبر زر «الدعم».`
        : `انتهى ${s.trial ? "التجربة المجانية" : "اشتراك المكتب"} في ${end}، والمنصة الآن للقراءة فقط: يمكنك فتح الدعاوى والاطلاع عليها وتصديرها، دون إضافة أو تعديل. جدّد الاشتراك لاستعادة العمل عبر زر «الدعم».`;
  return <div className={`mb-5 rounded-xl border px-4 py-3 text-sm leading-7 ${tone}`}>{text}</div>;
}
