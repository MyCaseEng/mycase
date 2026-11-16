"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCtx } from "@/lib/office";

// Hide one alert of one case until a date the user chooses.
export async function snoozeAlert(caseId: string, key: string, until: string) {
  const ctx = await getCtx();
  const supabase = await createClient();
  await supabase.from("alert_snoozes").upsert({ case_id: caseId, office_id: ctx.officeId, alert_key: key, until });
  revalidatePath("/", "layout");
}
