import { Suspense } from "react";
import { redirect } from "next/navigation";
import Shell from "./shell";
import { getCtx, ROLE_LABEL } from "@/lib/office";
import { createClient } from "@/lib/supabase/server";
import { loadBoard, caseLabel, getOfficeInfo } from "@/lib/cases";
import Letterhead from "@/components/letterhead";
import { caseAlerts, LEVEL_ORDER } from "@/lib/alerts";
import { normCaseNo } from "@/lib/format";
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
  const [{ cases, lettersOf, snoozes }, info] = await Promise.all([loadBoard(ctx.officeId), getOfficeInfo(ctx.officeId)]);
  const groups: CaseAlerts[] = cases
    .map((c) => ({
      caseId: c.id,
      label: caseLabel({ ...c, case_no: c.case_no ? normCaseNo(c.case_no) : null }),
      alerts: caseAlerts(c, lettersOf(c.id), snoozes).sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]),
    }))
    .filter((g) => g.alerts.length)
    .sort((a, b) => LEVEL_ORDER[a.alerts[0].level] - LEVEL_ORDER[b.alerts[0].level]);
  return (
    <Shell officeName={ctx.officeName} user={{ name: ctx.displayName, role: ROLE_LABEL[ctx.role] }} signOut={signOut} bell={<Bell groups={groups} />}
      letterhead={<Letterhead officeName={ctx.officeName} expertName={info.expertName} />}
    >
      {children}
    </Shell>
  );
}
