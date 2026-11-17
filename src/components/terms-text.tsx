import { TERMS, TERMS_DATE, TERMS_VERSION } from "@/lib/terms";
import { BRAND } from "@/lib/brand";

// The terms as readable text; used by the public page and the acceptance screen.
export default function TermsText() {
  return (
    <div className="space-y-5 text-justify leading-8">
      <div>
        <h1 className="text-2xl font-bold text-brand">شروط استخدام منصة {BRAND.name}</h1>
        <p className="mt-1 text-xs text-muted">الإصدار {TERMS_VERSION} · {TERMS_DATE}</p>
      </div>
      {TERMS.map((s, i) => (
        <section key={s.h}>
          <h2 className="mb-1 text-base font-bold text-ink">
            {i + 1}. {s.h}
          </h2>
          <ul className="list-disc space-y-1 pr-5 text-[15px]">
            {s.p.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
