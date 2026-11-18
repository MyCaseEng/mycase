"use server";
// The choice shown to the expert after 24 hours of exploring: start the free trial, or ask to subscribe.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCtx } from "@/lib/office";
import { PLANS, yearly, CURRENCY } from "@/lib/plans";

type Res = { ok: boolean; text: string };

export async function startTrial(): Promise<Res> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_trial");
  if (error) return { ok: false, text: error.message };
  revalidatePath("/", "layout");
  return { ok: true, text: `بدأت تجربتك المجانية، وآخر يوم فيها ${String(data).replace(/-/g, ".")}.` };
}

// Until online payment exists, a request reaches the platform owner as a support message; the trial starts meanwhile.
export async function requestSubscription(planKey: string, cycle: "monthly" | "yearly"): Promise<Res> {
  const ctx = await getCtx();
  const plan = PLANS.find((p) => p.key === planKey);
  if (!plan) return { ok: false, text: "اختر باقة." };
  const supabase = await createClient();
  const price = cycle === "yearly" ? `${yearly(plan).toLocaleString("en")} ${CURRENCY} سنويًا` : `${plan.monthly} ${CURRENCY} شهريًا`;
  const { error } = await supabase.from("support_tickets").insert({
    office_id: ctx.officeId,
    kind: "subscription",
    subject: `طلب اشتراك: باقة ${plan.name} (${cycle === "yearly" ? "سنوي" : "شهري"})`,
    body: `يطلب ${ctx.displayName} (${ctx.officeName}) الاشتراك في باقة «${plan.name}» بسعر ${price}. يرجى إرسال بيانات التحويل البنكي.`,
    files: [],
    page: "/",
  });
  if (error) return { ok: false, text: "تعذّر إرسال الطلب: " + error.message };
  await supabase.rpc("start_trial");
  revalidatePath("/", "layout");
  return { ok: true, text: "وصل طلبك. سنرسل لك بيانات التحويل البنكي عبر نافذة «الدعم»، وخلال ذلك تعمل المنصة بالتجربة المجانية." };
}
