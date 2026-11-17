// The office header from the first platform: basmala, the verse, ornament, office name and Qatar.
export default function Letterhead({ officeName, expertName }: { officeName: string; expertName: string }) {
  let lead = officeName;
  let person = expertName;
  if (expertName && officeName.includes(expertName)) lead = officeName.replace(expertName, "").trim();
  else if (!expertName) person = "";
  return (
    <div className="border-b-2 border-brand bg-white">
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
            {person && <span className="block font-bold text-brand md:inline">{person}</span>}
          </div>
        )}
        <div className="mt-1.5 flex items-center justify-center gap-2 font-display text-[13.5px] font-medium text-muted">
          <svg viewBox="0 0 28 11" width="34" height="13" role="img" aria-label="علم قطر" className="rounded-[2px] ring-1 ring-line">
            <rect width="28" height="11" fill="#8A1538" />
            <polygon
              fill="#fff"
              points="0,0 8,0 10.5,0.611 8,1.222 10.5,1.833 8,2.444 10.5,3.056 8,3.667 10.5,4.278 8,4.889 10.5,5.500 8,6.111 10.5,6.722 8,7.333 10.5,7.944 8,8.556 10.5,9.167 8,9.778 10.5,10.389 8,11.000 0,11"
            />
          </svg>
          <span>دولة قطر</span>
        </div>
      </div>
    </div>
  );
}
