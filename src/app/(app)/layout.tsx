import { Suspense } from "react";
import { redirect } from "next/navigation";
import Shell from "./shell";
import { getCtx, ROLE_LABEL } from "@/lib/office";
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
      <div data-noexport={ctx.sub?.phase === "view" ? "1" : undefined}>
        <SubBanner ctx={ctx} />
        {children}
      </div>
    </Shell>
  );
}

// Subscription notice: a warning to the expert before the end, then the grace, export and view-only notices to everyone.
function SubBanner({ ctx }: { ctx: Awaited<ReturnType<typeof getCtx>> }) {
  const s = ctx.sub;
  if (!s) return null;
  const what = s.trial ? "الفترة التجريبية المجانية" : "اشتراك المكتب";
  const support = "للاشتراك أو التجديد راسلنا عبر زر «الدعم».";
  // during the free trial the expert sees how many days are left
  if (s.phase === "ok") {
    if (!s.trial || ctx.realRole !== "admin") return null;
    return (
      <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
        أنت في الفترة التجريبية المجانية: باقٍ {days(s.daysLeft + 1)} (آخر يوم {fmtD(s.end)}).
      </div>
    );
  }
  if (s.phase === "warn" && ctx.realRole !== "admin") return null;
  const left = s.daysLeft + 1; // the last day counts
  const tone =
    s.phase === "view" ? "border-red-300 bg-red-50 text-red-900"
    : s.phase === "export" ? "border-orange-300 bg-orange-50 text-orange-900"
    : s.phase === "grace" ? "border-amber-300 bg-amber-50 text-amber-900"
    : "border-blue-200 bg-blue-50 text-blue-900";
  const text =
    s.phase === "warn"
      ? `${s.trial ? "تنتهي" : "ينتهي"} ${what} ${left === 1 ? "اليوم" : `بعد ${days(left - 1)}`} (آخر يوم ${fmtD(s.end)}). ${support}`
      : s.phase === "grace"
        ? `انتهى ${what} في ${fmtD(s.end)}. لديك صلاحيات كاملة حتى ${fmtD(s.fullUntil)}، ثم قراءة وتصدير فقط حتى ${fmtD(s.exportUntil)}، ثم مشاهدة فقط. ${support}`
        : s.phase === "export"
          ? `انتهى ${what} في ${fmtD(s.end)}. المنصة الآن للقراءة والتصدير فقط حتى ${fmtD(s.exportUntil)}: نزّل ما تحتاجه من ملفات Excel ومستندات Word والمرفقات. بعدها تصبح للمشاهدة فقط. ${support}`
          : `توقّف حساب المكتب: المشاهدة فقط، دون إضافة أو تعديل أو تصدير. لطلب نسخة من بياناتك أو للتجديد راسلنا عبر زر «الدعم». تُحفظ بياناتك حتى ${fmtD(s.deleteAfter)}، ويعود كل شيء كما كان عند التجديد.`;
  return <div className={`mb-5 rounded-xl border px-4 py-3 text-sm leading-7 ${tone}`}>{text}</div>;
}
