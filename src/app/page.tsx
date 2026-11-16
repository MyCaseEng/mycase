import Image from "next/image";
import { BRAND } from "@/lib/brand";

// Step 1 placeholder: proves the deploy, RTL, icon and install work. Real screens come in steps 3–6.
export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
        <Image src="/icons/icon-192.png" alt="" width={88} height={88} className="mx-auto rounded-2xl" priority />
        <h1 className="mt-5 text-3xl font-bold text-brand">{BRAND.name}</h1>
        <p className="mt-2 text-muted">{BRAND.tagline}</p>
        <div className="mt-6 rounded-xl bg-background p-4 text-sm leading-7 text-foreground">
          النسخة الأولى قيد البناء.
          <br />
          يمكنك الآن تثبيت المنصة كأيقونة على جهازك من قائمة المتصفح.
        </div>
        <p className="mt-6 text-xs text-muted">الخطوة 1 من 10 · الإعداد والنشر الأول</p>
      </div>
    </main>
  );
}
