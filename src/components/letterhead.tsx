import { countryName, flagUrl, validCountry } from "@/lib/countries";

// The office header: basmala and the verse are fixed; office name, expert and country come from the office.
export default function Letterhead({ officeName, expertName, country }: { officeName: string; expertName: string; country: string }) {
  const code = validCountry(country);
  let lead = officeName;
  let person = expertName;
  if (expertName && officeName.includes(expertName)) lead = officeName.replace(expertName, "").trim();
  else if (!expertName) person = "";
  return (
    <div className="border-b border-line bg-white">
      <div className="mx-auto max-w-4xl px-5 pb-3 pt-3.5 text-center">
        <div className="font-ruqaa text-[28px] font-bold leading-snug text-brand md:text-[34px]">بسم الله الرحمن الرحيم</div>
        <div className="font-amiri text-[14.5px] leading-relaxed text-muted md:text-base">
          ﴿إِنَّ اللَّهَ يَأْمُرُكُمْ أَن تُؤَدُّوا الْأَمَانَاتِ إِلَىٰ أَهْلِهَا وَإِذَا حَكَمْتُم بَيْنَ النَّاسِ أَن تَحْكُمُوا بِالْعَدْلِ﴾
          <span className="ms-1.5 font-display text-[11.5px] text-gold">النساء: 58</span>
        </div>
        <div className="mx-auto my-2.5 flex max-w-[520px] items-center gap-3" aria-hidden="true">
          <i className="h-px flex-1 bg-[linear-gradient(90deg,transparent,var(--gold),transparent)]" />
          <b className="size-[9px] flex-none rotate-45 border-[1.5px] border-gold" />
          <i className="h-px flex-1 bg-[linear-gradient(90deg,transparent,var(--gold),transparent)]" />
        </div>
        {(lead || person) && (
          <div className="font-display text-[15.5px] font-semibold md:text-lg">
            {lead}
            {lead && person && <span className="mx-1.5 hidden text-gold md:inline">·</span>}
            {person && <span className="block md:inline">{person}</span>}
          </div>
        )}
        <div className="mt-1.5 flex items-center justify-center gap-2 font-display text-[13.5px] font-medium text-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={flagUrl(code)} alt="" width={20} height={13} className="h-[13px] w-auto rounded-[2px] ring-1 ring-line" />
          <span>{countryName(code)}</span>
        </div>
      </div>
    </div>
  );
}
