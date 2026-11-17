import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { BRAND } from "@/lib/brand";
import { createClient } from "@/lib/supabase/server";
import { countryName, flagUrl } from "@/lib/countries";
import { SpecialtyIcon, specialtyOf } from "@/lib/specialties";
import { fmtD, todayStr, dayDiff } from "@/lib/format";

export const metadata = { title: "لوحة المنصة" };

type Row = {
  id: string;
  name: string;
  expert_name: string | null;
  country: string;
  specialty: string;
  is_active: boolean;
  created_at: string;
  admin_name: string | null;
  admin_email: string | null;
  members: number;
  cases: number;
  open_cases: number;
  imports: number;
  last_activity: string | null;
  last_sign_in: string | null;
};

// Platform owner only: every office that opened an account, with counts (never the content of their cases).
export default function PlatformPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-muted">جارٍ التحميل…</div>}>
      <Platform />
    </Suspense>
  );
}

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// The platform owner does not need an office of their own: this page stands outside the office pages.
async function Platform() {
  const supabase = await createClient();
  const { data: cl } = await supabase.auth.getClaims();
  if (!cl?.claims?.sub) redirect("/login");
  const { data: owner } = await supabase.rpc("is_platform_admin");
  if (!owner) notFound();
  const { data: mine } = await supabase.from("members").select("office_id").eq("user_id", cl.claims.sub).eq("is_active", true).limit(1);
  const { data, error } = await supabase.rpc("platform_offices");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Row[];
  const t = todayStr();
  const day = (iso: string | null) => (iso ? iso.slice(0, 10) : null);
  const ago = (iso: string | null) => {
    const d = day(iso);
    if (!d) return "—";
    const n = -dayDiff(d);
    return n <= 0 ? "اليوم" : n === 1 ? "أمس" : `قبل ${n} يوماً`;
  };
  const newWeek = rows.filter((r) => -dayDiff(day(r.created_at)!) <= 7).length;
  const activeWeek = rows.filter((r) => r.last_activity && -dayDiff(day(r.last_activity)!) <= 7).length;
  const tiles: [number, string][] = [
    [rows.length, "مكتب مسجّل"],
    [newWeek, "مكتب جديد هذا الأسبوع"],
    [activeWeek, "مكتب نشط هذا الأسبوع"],
    [rows.reduce((n, r) => n + r.members, 0), "مستخدم"],
    [rows.reduce((n, r) => n + r.cases, 0), "دعوى في المنصة"],
    [rows.reduce((n, r) => n + r.imports, 0), "قراءة PDF بالذكاء الاصطناعي"],
  ];
  const byCountry = Object.entries(
    rows.reduce<Record<string, number>>((m, r) => ((m[r.country] = (m[r.country] ?? 0) + 1), m), {})
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1560px] items-center gap-3 px-4 py-3 lg:px-8">
          <Image src="/icons/icon-192.png" alt="" width={32} height={32} className="rounded-lg" />
          <div className="flex-1">
            <div className="font-display font-bold">{BRAND.name}</div>
            <div className="text-[11px] text-muted">إدارة المنصة</div>
          </div>
          {mine?.length ? (
            <Link href="/" className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-brand">
              مكتبي ←
            </Link>
          ) : null}
          <form action={signOut}>
            <button className="text-sm text-muted hover:text-red-700">تسجيل الخروج</button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-4 py-6 md:px-8">
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div>
        <h1 className="text-2xl font-bold">لوحة المنصة</h1>
        <p className="text-sm text-muted">
          تظهر لمالك المنصة فقط · {fmtD(t)} · يظهر هنا ملخص كل مكتب وأرقامه، لا محتوى دعاواه.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {tiles.map(([n, l]) => (
          <div key={l} className="rounded-xl border border-line bg-white p-4">
            <div className="font-display text-2xl font-bold">{n}</div>
            <div className="text-xs text-muted">{l}</div>
          </div>
        ))}
      </div>

      {byCountry.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {byCountry.map(([c, n]) => (
            <span key={c} className="flex items-center gap-1.5 rounded-full border border-line bg-white py-1 pe-3 ps-1 text-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={flagUrl(c)} alt="" className="size-5 rounded-full" />
              {countryName(c)} <b>{n}</b>
            </span>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-background text-right text-xs text-muted">
            <tr>
              {["المكتب", "الدولة", "التخصص", "المدير", "تاريخ الإنشاء", "الأعضاء", "الدعاوى (المفتوحة)", "قراءات PDF", "آخر نشاط", "آخر دخول"].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line align-top">
                <td className="px-3 py-2.5">
                  <b>{r.name}</b>
                  {r.expert_name && <div className="text-xs text-muted">{r.expert_name}</div>}
                  {!r.is_active && <span className="text-xs text-red-700">موقوف</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <span className="flex items-center gap-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={flagUrl(r.country)} alt="" className="size-5 rounded-full" />
                    {countryName(r.country)}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-1.5">
                    <span className="text-brand">
                      <SpecialtyIcon code={r.specialty} size={16} />
                    </span>
                    {specialtyOf(r.specialty).name}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {r.admin_name ?? "—"}
                  {r.admin_email && (
                    <a href={`mailto:${r.admin_email}`} dir="ltr" className="block text-xs text-muted hover:text-brand">
                      {r.admin_email}
                    </a>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{fmtD(day(r.created_at)!)}</td>
                <td className="px-3 py-2.5 tabular-nums">{r.members}</td>
                <td className="px-3 py-2.5 tabular-nums">
                  {r.cases} <span className="text-muted">({r.open_cases})</span>
                </td>
                <td className="px-3 py-2.5 tabular-nums">{r.imports}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{ago(r.last_activity)}</td>
                <td className="whitespace-nowrap px-3 py-2.5">{ago(r.last_sign_in)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-muted">
                  لا توجد مكاتب بعد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
      </main>
    </div>
  );
}
