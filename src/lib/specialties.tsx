// Type and field of the expertise, chosen once when the office is created; its icon sits beside the basmala.
import type { ReactNode } from "react";

export const SPECIALTIES: { code: string; name: string; icon: ReactNode }[] = [
  { code: "eng", name: "خبرة هندسية (عامة)", icon: <><circle cx="12" cy="5" r="2" /><path d="M11 7 6 20M13 7l5 13M8.5 14h7" /></> },
  { code: "civil", name: "هندسة مدنية وإنشائية", icon: <path d="M3 18h18M5 18v-6M19 18v-6M3 12h18M7 12a5 5 0 0 1 10 0" /> },
  { code: "arch", name: "هندسة معمارية", icon: <><path d="M4 20 20 4v16z" /><path d="M12 20v-4M16 20v-8" /></> },
  { code: "cons", name: "مقاولات وعقود إنشاءات", icon: <><path d="M4 17h16v2H4z" /><path d="M5 17a7 7 0 0 1 14 0" /><path d="M10 10.5V6h4v4.5" /></> },
  { code: "elec", name: "هندسة كهربائية", icon: <path d="M13 3 5 14h6l-1 7 8-11h-6z" /> },
  {
    code: "mech",
    name: "هندسة ميكانيكية",
    icon: <><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" /></>,
  },
  { code: "survey", name: "هندسة مساحة", icon: <><path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z" /><circle cx="12" cy="10" r="2" /></> },
  {
    code: "account",
    name: "خبرة محاسبية ومالية",
    icon: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" /></>,
  },
  { code: "realestate", name: "خبرة عقارية وتثمين", icon: <><path d="M4 11l8-7 8 7" /><path d="M6 9.5V20h12V9.5" /><path d="M10 20v-5h4v5" /></> },
  { code: "medical", name: "خبرة طبية", icon: <><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M12 7v10M7 12h10" /></> },
  {
    code: "it",
    name: "تقنية المعلومات",
    icon: <><rect x="7" y="7" width="10" height="10" rx="1.5" /><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4" /></>,
  },
  { code: "other", name: "خبرة أخرى", icon: <><path d="M12 4v16M8 20h8M5 7h14" /><path d="M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z" /></> },
];
export const DEFAULT_SPECIALTY = "eng";
export const specialtyOf = (code?: string | null) =>
  SPECIALTIES.find((s) => s.code === code) ?? SPECIALTIES.find((s) => s.code === DEFAULT_SPECIALTY)!;
export const validSpecialty = (code: unknown) => (SPECIALTIES.some((s) => s.code === code) ? String(code) : DEFAULT_SPECIALTY);

export function SpecialtyIcon({ code, size = 24 }: { code?: string | null; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {specialtyOf(code).icon}
      </g>
    </svg>
  );
}
