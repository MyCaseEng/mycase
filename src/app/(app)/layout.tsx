import { Suspense } from "react";
import { redirect } from "next/navigation";
import Shell from "./shell";
import { getCtx, ROLE_LABEL } from "@/lib/office";
import { createClient } from "@/lib/supabase/server";

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
  return (
    <Shell officeName={ctx.officeName} user={{ name: ctx.displayName, role: ROLE_LABEL[ctx.role] }} signOut={signOut}>
      {children}
    </Shell>
  );
}
