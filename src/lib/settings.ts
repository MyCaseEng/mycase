import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PREFIX, QTPL_DEFAULT } from "@/lib/refs";

export type OfficeSettings = {
  refPrefix: string;
  qTemplates: Record<string, string[]>;
  defaultReplyDays: number;
};

// Office settings live in office_settings.data (jsonb); missing keys fall back to the office defaults.
export async function getSettings(officeId: string): Promise<OfficeSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("office_settings").select("data").eq("office_id", officeId).maybeSingle();
  const d = (data?.data ?? {}) as Partial<OfficeSettings>;
  return {
    refPrefix: d.refPrefix || DEFAULT_PREFIX,
    // once the office saves its own templates they replace the defaults (so a default can be deleted)
    qTemplates: d.qTemplates && Object.keys(d.qTemplates).length ? d.qTemplates : QTPL_DEFAULT,
    defaultReplyDays: d.defaultReplyDays || 5,
  };
}
