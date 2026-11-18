import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TERMS_VERSION } from "@/lib/terms";
import { isStaffEmail } from "@/lib/staff";
import { officeSub, type OfficeSub, type Sub } from "@/lib/subscription";
import { todayStr } from "@/lib/format";

export type Role = "admin" | "member" | "viewer";
export type Ctx = {
  userId: string;
  email: string;
  officeId: string;
  officeName: string;
  role: Role; // "viewer" for everyone while the subscription is read-only
  realRole: Role;
  displayName: string;
  sub: OfficeSub | null; // null until update 0022 exists
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
  const findMember = () =>
    supabase
      .from("members")
      .select("*, offices(name)")
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
  // a team account made by the expert starts with a temporary password
  if ((m as { must_change?: boolean } | null)?.must_change) redirect("/change-password");
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
  const { data: sr, error: se } = await supabase.from("subscriptions").select("trial_ends, paid_until, cancelled_at, cycle_months").eq("office_id", m.office_id).maybeSingle();
  const sub = se || !sr ? null : officeSub(sr as Sub, todayStr());
  // after the subscription ends: read + export, then view only (the database enforces the same rules)
  const role = sub?.phase === "export" || sub?.phase === "view" ? "viewer" : (m.role as Role);
  return {
    userId,
    email: claims.email ?? "",
    officeId: m.office_id,
    officeName: office?.name ?? "",
    role,
    realRole: m.role as Role,
    displayName: m.display_name,
    sub,
  };
});

export const ROLE_LABEL: Record<Role, string> = { admin: "مدير المكتب", member: "عضو الفريق", viewer: "مطّلع" };
