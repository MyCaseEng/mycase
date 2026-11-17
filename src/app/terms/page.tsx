import type { Metadata } from "next";
import TermsText from "@/components/terms-text";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `شروط الاستخدام · ${BRAND.name}` };

// Public: readable before signing up.
export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6 md:p-10">
      <div className="rounded-2xl border border-line bg-white p-6 shadow-sm md:p-10">
        <TermsText />
      </div>
    </main>
  );
}
