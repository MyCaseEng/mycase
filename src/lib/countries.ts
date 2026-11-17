// Country shown in the letterhead under the office name, with its flag. The office picks it at creation or in settings.
export const COUNTRIES: [code: string, name: string][] = [
  ["QA", "دولة قطر"],
  ["AE", "دولة الإمارات العربية المتحدة"],
  ["SA", "المملكة العربية السعودية"],
  ["KW", "دولة الكويت"],
  ["BH", "مملكة البحرين"],
  ["OM", "سلطنة عُمان"],
  ["JO", "المملكة الأردنية الهاشمية"],
  ["EG", "جمهورية مصر العربية"],
  ["IQ", "جمهورية العراق"],
  ["SY", "الجمهورية العربية السورية"],
  ["LB", "الجمهورية اللبنانية"],
  ["PS", "دولة فلسطين"],
  ["YE", "الجمهورية اليمنية"],
  ["SD", "جمهورية السودان"],
  ["LY", "دولة ليبيا"],
  ["TN", "الجمهورية التونسية"],
  ["DZ", "الجمهورية الجزائرية الديمقراطية الشعبية"],
  ["MA", "المملكة المغربية"],
  ["MR", "الجمهورية الإسلامية الموريتانية"],
  ["SO", "جمهورية الصومال"],
  ["DJ", "جمهورية جيبوتي"],
  ["KM", "جمهورية القمر المتحدة"],
  ["TR", "الجمهورية التركية"],
];
export const DEFAULT_COUNTRY = "QA";
export const countryName = (code?: string | null) =>
  COUNTRIES.find(([c]) => c === code)?.[1] ?? COUNTRIES.find(([c]) => c === DEFAULT_COUNTRY)![1];
export const validCountry = (code: unknown) => (COUNTRIES.some(([c]) => c === code) ? String(code) : DEFAULT_COUNTRY);
// Round flags drawn for circles (HatScripts circle-flags, free, every country), served from the project's own site.
export const flagUrl = (code: string) => `https://hatscripts.github.io/circle-flags/flags/${code.toLowerCase()}.svg`;

// Platform colors per country. The look is calm and professional: white and grey surfaces, charcoal buttons,
// and the country color only as a light touch (basmala, the active menu line, links, small badges).
// Each country gets a deep, greyed take on its flag's main color; the antique brass is shared by all.
const GREEN = "#2e5545";
const CRIMSON = "#6e2e38";
const NAVY = "#33495f";
const BRASS = "#8f6d36";
const fam: Record<string, string> = {
  QA: "#7a2840",
  SA: GREEN, AE: GREEN, KW: GREEN, JO: GREEN, PS: GREEN, SY: GREEN, SD: GREEN, LY: GREEN, DZ: GREEN, MR: GREEN,
  BH: CRIMSON, OM: CRIMSON, EG: CRIMSON, IQ: CRIMSON, LB: CRIMSON, YE: CRIMSON, TN: CRIMSON, MA: CRIMSON, TR: CRIMSON,
  SO: NAVY, DJ: NAVY, KM: NAVY,
};
export const THEMES: Record<string, { brand: string; accent: string }> = Object.fromEntries(
  Object.entries(fam).map(([c, brand]) => [c, { brand, accent: c === "QA" ? "#96713a" : BRASS }])
);
export const themeOf = (code?: string | null) => THEMES[validCountry(code)] ?? THEMES[DEFAULT_COUNTRY];
// CSS variables for the office's pages (set on the app shell, so every page and dialog inside follows).
export const themeVars = (code?: string | null) => {
  const t = themeOf(code);
  return {
    "--brand": t.brand,
    "--gold": t.accent,
    "--brand-soft": `color-mix(in srgb, ${t.brand} 7%, white)`,
    "--gold-soft": `color-mix(in srgb, ${t.accent} 11%, white)`,
  } as React.CSSProperties;
};
