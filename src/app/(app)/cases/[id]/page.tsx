import { notFound } from "next/navigation";
import { getCtx } from "@/lib/office";
import { getCase, listMembers, listNotes } from "@/lib/cases";
import CaseView from "./view";

export default async function CasePage({ params }: PageProps<"/cases/[id]">) {
  const { id } = await params;
  const ctx = await getCtx();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [c, members, notes] = await Promise.all([getCase(ctx.officeId, id), listMembers(ctx.officeId), listNotes(id)]);
  if (!c) notFound();
  return <CaseView c={c} members={members} notes={notes} canWrite={ctx.role !== "viewer"} />;
}
