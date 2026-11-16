import { notFound } from "next/navigation";
import { getCtx } from "@/lib/office";
import { getCase, listMembers, listNotes, listLetters, listRefs, listProcRows, getOfficeInfo } from "@/lib/cases";
import { getSettings } from "@/lib/settings";
import { caseAlerts, LEVEL_ORDER } from "@/lib/alerts";
import { createClient } from "@/lib/supabase/server";
import CaseView from "./view";

export default async function CasePage({ params }: PageProps<"/cases/[id]">) {
  const { id } = await params;
  const ctx = await getCtx();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [c, members, notes, letters, refs, settings, procRows, office] = await Promise.all([
    getCase(ctx.officeId, id),
    listMembers(ctx.officeId),
    listNotes(id),
    listLetters(id),
    listRefs(ctx.officeId, id),
    getSettings(ctx.officeId),
    listProcRows(id),
    getOfficeInfo(ctx.officeId),
  ]);
  if (!c) notFound();
  const supabase = await createClient();
  const { data: snoozes } = await supabase.from("alert_snoozes").select("case_id, alert_key, until").eq("case_id", id);
  const alerts = caseAlerts(c, letters, snoozes ?? []).sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
  return (
    <CaseView
      c={c}
      members={members}
      notes={notes}
      letters={letters}
      alerts={alerts}
      office={office}
      procRows={procRows}
      refs={refs}
      settings={{ refPrefix: settings.refPrefix, qTemplates: settings.qTemplates, defaultReplyDays: settings.defaultReplyDays }}
      canWrite={ctx.role !== "viewer"}
    />
  );
}
