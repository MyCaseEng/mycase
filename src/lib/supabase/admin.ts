import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service client: creates and resets team accounts. Server only, never sent to the browser.
// The key lives only in Vercel (SUPABASE_SERVICE_ROLE_KEY).
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
