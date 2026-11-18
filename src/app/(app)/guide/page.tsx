import Link from "next/link";
import { GUIDE } from "@/lib/guide";

export const metadata = { title: "دليل الاستخدام" };

// The user guide: a short section for each part of the platform, with a link to open it.
export default function GuidePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">دليل الاستخدام</h1>
        <p className="text-muted">شرح مختصر لكل قسم في المنصة. وإن احتجت مساعدة أخرى فزر «الدعم» في أعلى الصفحة.</p>
      </div>
      <nav className="flex flex-wrap gap-2">
        {GUIDE.map((g, i) => (
          <a key={g.id} href={`#${g.id}`} className="rounded-full border border-line bg-white px-3 py-1 text-sm hover:border-brand">
            {i + 1}. {g.title}
          </a>
        ))}
      </nav>
      {GUIDE.map((g, i) => (
        <section key={g.id} id={g.id} className="scroll-mt-24 rounded-2xl border border-line bg-white p-5">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="flex-1 text-lg font-bold">
              <span className="text-brand">{i + 1}.</span> {g.title}
            </h2>
            {g.href && g.open && (
              <Link href={g.href} className="rounded-lg border border-line px-3 py-1 text-sm hover:border-brand">
                افتح «{g.open}» ←
              </Link>
            )}
          </div>
          <p className="mt-1 text-muted">{g.intro}</p>
          <ul className="mt-3 space-y-2">
            {g.steps.map((s) => (
              <li key={s} className="flex gap-2 leading-7">
                <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
