import { notFound } from "next/navigation";
import { getCtx } from "@/lib/office";
import { getCase, listMembers, listNotes, listLetters, listRefs } from "@/lib/cases";
import { getSettings } from "@/lib/settings";
import CaseView from "./view";

export default async function CasePage({ params }: PageProps<"/cases/[id]">) {
  const { id } = await params;
  const ctx = await getCtx();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [c, members, notes, letters, refs, settings] = await Promise.all([
    getCase(ctx.officeId, id),
    listMembers(ctx.officeId),
    listNotes(id),
    listLetters(id),
    listRefs(ctx.officeId, id),
    getSettings(ctx.officeId),
  ]);
  if (!c) notFound();
  return (
    <CaseView
      c={c}
      members={members}
      notes={notes}
      letters={letters}
      refs={refs}
      settings={{ refPrefix: settings.refPrefix, qTemplates: settings.qTemplates, defaultReplyDays: settings.defaultReplyDays }}
      canWrite={ctx.role !== "viewer"}
    />
  );
}
