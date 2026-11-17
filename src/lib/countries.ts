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
// Flag images from flagcdn.com (free, all countries, sharp at any size).
export const flagUrl = (code: string) => `https://flagcdn.com/${code.toLowerCase()}.svg`;

// Platform colors per country. Not the raw flag colors (too loud for a professional tool): each is a deep,
// muted take on the flag's main color, always paired with the same antique brass, the way Qatar's maroon is.
// Three families: deep green, deep crimson, deep navy. All pass white-text contrast.
const BRASS = "#8f6d36";
export const THEMES: Record<string, { brand: string; accent: string }> = {
  QA: { brand: "#8a1538", accent: "#96713a" },
  // deep greens
  SA: { brand: "#165a3d", accent: BRASS },
  AE: { brand: "#1e5b45", accent: BRASS },
  KW: { brand: "#1d5a46", accent: BRASS },
  JO: { brand: "#21563f", accent: BRASS },
  PS: { brand: "#1f5841", accent: BRASS },
  SY: { brand: "#1f5743", accent: BRASS },
  SD: { brand: "#1d553d", accent: BRASS },
  LY: { brand: "#1c5139", accent: BRASS },
  DZ: { brand: "#195a3f", accent: BRASS },
  MR: { brand: "#1b5a3c", accent: BRASS },
  // deep crimsons
  BH: { brand: "#8b1e2e", accent: BRASS },
  OM: { brand: "#80202a", accent: BRASS },
  EG: { brand: "#7f1d27", accent: BRASS },
  IQ: { brand: "#7a1f28", accent: BRASS },
  LB: { brand: "#7d2129", accent: BRASS },
  YE: { brand: "#7b1e2a", accent: BRASS },
  TN: { brand: "#8a1c26", accent: BRASS },
  MA: { brand: "#7e1c22", accent: BRASS },
  TR: { brand: "#861d26", accent: BRASS },
  // deep navies
  SO: { brand: "#244e78", accent: BRASS },
  DJ: { brand: "#214a6c", accent: BRASS },
  KM: { brand: "#234f77", accent: BRASS },
};
export const themeOf = (code?: string | null) => THEMES[validCountry(code)] ?? THEMES[DEFAULT_COUNTRY];
// CSS variables for the office's pages (set on the app shell, so every page and dialog inside follows).
export const themeVars = (code?: string | null) => {
  const t = themeOf(code);
  return {
    "--brand": t.brand,
    "--gold": t.accent,
    "--brand-soft": `color-mix(in srgb, ${t.brand} 9%, white)`,
    "--gold-soft": `color-mix(in srgb, ${t.accent} 14%, white)`,
  } as React.CSSProperties;
};
