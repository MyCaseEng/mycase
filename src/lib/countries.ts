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

// Platform colors per country, taken from its flag: brand = buttons, active menu, headings;
// accent = ornament and small highlights. All pass white-text / white-background contrast.
export const THEMES: Record<string, { brand: string; accent: string }> = {
  QA: { brand: "#8a1538", accent: "#96713a" },
  AE: { brand: "#00732f", accent: "#b5121b" },
  SA: { brand: "#006c35", accent: "#8a6d2f" },
  KW: { brand: "#007a3d", accent: "#b5121b" },
  BH: { brand: "#c8102e", accent: "#8a6d3b" },
  OM: { brand: "#c8102e", accent: "#00703c" },
  JO: { brand: "#007a3d", accent: "#b5121b" },
  EG: { brand: "#c8102e", accent: "#8a6d3b" },
  IQ: { brand: "#b5121b", accent: "#007a3d" },
  SY: { brand: "#007a3d", accent: "#b5121b" },
  LB: { brand: "#b5121b", accent: "#00843d" },
  PS: { brand: "#007a3d", accent: "#c8102e" },
  YE: { brand: "#c8102e", accent: "#7a6a4f" },
  SD: { brand: "#007229", accent: "#c8102e" },
  LY: { brand: "#1b7a3a", accent: "#c8102e" },
  TN: { brand: "#c8102e", accent: "#8a6d3b" },
  DZ: { brand: "#006233", accent: "#b5121b" },
  MA: { brand: "#c1272d", accent: "#006233" },
  MR: { brand: "#00703c", accent: "#946f00" },
  SO: { brand: "#1f5fa8", accent: "#8a6d3b" },
  DJ: { brand: "#1f5fa8", accent: "#12823b" },
  KM: { brand: "#1f5fa8", accent: "#127a3a" },
  TR: { brand: "#c8102e", accent: "#8a6d3b" },
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
