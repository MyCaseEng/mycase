// Shared by the office help window (client) and the platform dashboard (server).
export const KIND_LABEL: Record<string, string> = { problem: "مشكلة", suggestion: "اقتراح", question: "استفسار" };
const PAGES: [RegExp, string][] = [
  [/^\/$/, "الصفحة الرئيسية"],
  [/^\/cases\/new/, "دعوى جديدة"],
  [/^\/cases\/[^/]+/, "صفحة دعوى"],
  [/^\/cases/, "الدعاوى"],
  [/^\/schedule/, "جدول المواعيد"],
  [/^\/refs/, "سجل الأرقام المرجعية"],
  [/^\/procedures/, "إجراءات المأمورية"],
  [/^\/team/, "الفريق والحِمل"],
  [/^\/activity/, "سجل النشاط"],
  [/^\/settings/, "الإعدادات"],
  [/^\/suspended/, "صفحة الإيقاف"],
];
export const pageLabel = (p?: string | null) => (p ? PAGES.find(([r]) => r.test(p))?.[1] ?? p : "");
