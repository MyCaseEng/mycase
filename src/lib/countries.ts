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
