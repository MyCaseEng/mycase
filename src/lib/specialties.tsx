// Type and field of the expertise, chosen once when the office is created; its icon sits beside the basmala.
import type { ReactNode } from "react";

// Drawn as clear pictures of each field (a tower crane for engineering, a stethoscope for medicine...).
export const SPECIALTIES: { code: string; name: string; icon: ReactNode }[] = [
  {
    code: "eng",
    name: "خبرة هندسية (عامة)",
    icon: <><path d="M6 21V5.5M8.5 21V5.5M6 18.5l2.5-2.5M6 14.5 8.5 12M6 10.5 8.5 8M3.5 5.5h18M7.25 2.5v3M7.25 2.5 21.5 5.5M7.25 2.5 3.5 5.5M18.5 5.5V12" /><path d="M17.3 12h2.4v1.6a1.2 1.2 0 0 1-2.4 0z" /><path d="M3.5 5.5v2h2.5v-2M3.5 21h8" /></>,
  },
  {
    code: "civil",
    name: "هندسة مدنية وإنشائية",
    icon: <><path d="M2 17h20M2 10h20M4.5 10v11M19.5 10v11" /><path d="M4.5 10c2.5 0 4 3 7.5 3s5-3 7.5-3" /><path d="M8 11.6V17M12 13v4M16 11.6V17" /></>,
  },
  {
    code: "arch",
    name: "هندسة معمارية",
    icon: <><path d="M3 21V8l13 13z" /><path d="M6 18v-3.5l3.5 3.5z" /><path d="M14 4.5 18.5 3 17 7.5l-6.5 6.5-3 1 1-3z" /></>,
  },
  {
    code: "cons",
    name: "مقاولات وعقود إنشاءات",
    icon: <><path d="M2.5 18.5h19" /><path d="M4.5 18.5V16a7.5 7.5 0 0 1 15 0v2.5" /><path d="M9.5 9.3V6.5h5v2.8M12 6.5v6" /></>,
  },
  {
    code: "elec",
    name: "هندسة كهربائية",
    icon: <path d="M12 2.5 7 21.5M12 2.5l5 19M4 7.5h16M5.5 12.5h13M7.5 7.5l8.3 5M16.5 7.5l-8.3 5M8.4 17.5h7.2M2.5 7.5v1.5M21.5 7.5v1.5" />,
  },
  {
    code: "mech",
    name: "هندسة ميكانيكية",
    icon: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  },
  {
    code: "survey",
    name: "هندسة مساحة",
    icon: <><path d="M8.5 3.5h7v6h-7zM15.5 5.5h3M10 9.5h4V12h-4zM12 12 6 21.5M12 12l6 9.5M12 12v9.5" /><circle cx="12" cy="6.5" r="1.3" /></>,
  },
  {
    code: "account",
    name: "خبرة محاسبية ومالية",
    icon: <><rect x="5" y="2.5" width="14" height="19" rx="2" /><path d="M8 6h8v3H8zM8.5 13h.01M12 13h.01M15.5 13h.01M8.5 17h.01M12 17h.01M15.5 17h.01" /></>,
  },
  {
    code: "realestate",
    name: "خبرة عقارية وتثمين",
    icon: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 9.5V20h13V9.5M15.5 6.5V4.5h2v3.6" /><path d="M10 20v-5h4v5" /></>,
  },
  {
    code: "medical",
    name: "خبرة طبية",
    icon: <><path d="M5 2.5h1.5M11.5 2.5H13M5.8 2.5v6a3.5 3.5 0 0 0 7 0v-6" /><path d="M9.3 12v2.5a4.5 4.5 0 0 0 9 0V13" /><circle cx="18.3" cy="11" r="2" /></>,
  },
  {
    code: "it",
    name: "تقنية المعلومات",
    icon: <><rect x="4" y="4.5" width="16" height="11" rx="1.5" /><path d="M2 19.5h20M9 9l-2 1.5L9 12M15 9l2 1.5L15 12M13 8.5l-2 4" /></>,
  },
  {
    code: "other",
    name: "خبرة أخرى",
    icon: <><path d="M12 4v16M8 20h8M5 7h14" /><path d="M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z" /></>,
  },
];
export const DEFAULT_SPECIALTY = "eng";
export const specialtyOf = (code?: string | null) =>
  SPECIALTIES.find((s) => s.code === code) ?? SPECIALTIES.find((s) => s.code === DEFAULT_SPECIALTY)!;
export const validSpecialty = (code: unknown) => (SPECIALTIES.some((s) => s.code === code) ? String(code) : DEFAULT_SPECIALTY);

export function SpecialtyIcon({ code, size = 24, className }: { code?: string | null; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={className ? undefined : size} height={className ? undefined : size} className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        {specialtyOf(code).icon}
      </g>
    </svg>
  );
}
