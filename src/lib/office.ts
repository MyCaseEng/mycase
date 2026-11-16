import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "member" | "viewer";
export type Ctx = {
  userId: string;
  email: string;
  officeId: string;
  officeName: string;
  role: Role;
  displayName: string;
};

// Current user + office for every page in the app. Joins pending invitations first.
// One office per user for now; an office switcher comes when someone belongs to two.
export const getCtx = cache(async (): Promise<Ctx> => {
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) redirect("/login");
  await supabase.rpc("accept_invitations");
  const { data: m } = await supabase
    .from("members")
    .select("office_id, role, display_name, offices(name)")
    .eq("user_id", u.user.id)
    .eq("is_active", true)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!m) redirect("/welcome");
  const office = m.offices as unknown as { name: string } | null;
  return {
    userId: u.user.id,
    email: u.user.email ?? "",
    officeId: m.office_id,
    officeName: office?.name ?? "",
    role: m.role as Role,
    displayName: m.display_name,
  };
});

export const ROLE_LABEL: Record<Role, string> = { admin: "مدير المكتب", member: "عضو الفريق", viewer: "مطّلع" };
