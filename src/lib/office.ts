import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TERMS_VERSION } from "@/lib/terms";
import { isStaffEmail } from "@/lib/staff";

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
  // getClaims verifies the session token locally (no round trip to the auth server on every page)
  const { data: cl } = await supabase.auth.getClaims();
  const claims = cl?.claims as { sub?: string; email?: string; user_metadata?: { terms_version?: string; must_change?: boolean } } | undefined;
  if (!claims?.sub) redirect("/login");
  const userId = claims.sub;
  // a team account made by the expert starts with a temporary password
  if (claims.user_metadata?.must_change) redirect("/change-password");
  const findMember = () =>
    supabase
      .from("members")
      .select("office_id, role, display_name, offices(name)")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at")
      .limit(1)
      .maybeSingle();
  const [mem, terms] = await Promise.all([
    findMember(),
    supabase.from("terms_acceptances").select("version").eq("user_id", userId).eq("version", TERMS_VERSION).maybeSingle(),
  ]);
  let { data: m } = mem;
  // the expert (office admin) accepts the terms once for the office; team members are covered by that.
  // Agreeing at sign-up counts, and is recorded here on the first visit.
  if (m?.role === "admin" && !terms.error && !terms.data) {
    if (claims.user_metadata?.terms_version === TERMS_VERSION) await supabase.rpc("accept_terms", { p_version: TERMS_VERSION });
    else redirect("/accept-terms");
  }
  if (!m) {
    // only when the user has no office yet: join any office that invited this email
    await supabase.rpc("accept_invitations");
    ({ data: m } = await findMember());
  }
  // a member whose office was suspended by the platform owner still sees their membership, but not the office
  if (m && !m.offices) redirect("/suspended");
  // a stopped team account has nothing else to open
  if (!m && isStaffEmail(claims.email)) redirect("/suspended");
  if (!m) {
    // the platform owner may have no office of their own: send them to the platform dashboard
    const { data: owner } = await supabase.rpc("is_platform_admin");
    redirect(owner ? "/platform" : "/welcome");
  }
  const office = m.offices as unknown as { name: string } | null;
  return {
    userId,
    email: claims.email ?? "",
    officeId: m.office_id,
    officeName: office?.name ?? "",
    role: m.role as Role,
    displayName: m.display_name,
  };
});

export const ROLE_LABEL: Record<Role, string> = { admin: "مدير المكتب", member: "عضو الفريق", viewer: "مطّلع" };
