// Office formatting rules, ported from the prototype (reference/prototype-index.html).
// Dates YYYY.MM.DD · case numbers "number - year" · no slashes in the case type.

export const todayStr = () => {
  // Qatar time, so "today" flips at local midnight
  const d = new Date(Date.now() + 3 * 3600_000);
  return d.toISOString().slice(0, 10);
};
export const fmtD = (d?: string | null) => (d ? d.slice(0, 10).replace(/-/g, ".") : "—");
export const dayDiff = (d: string) =>
  Math.round((Date.parse(d.slice(0, 10) + "T00:00:00Z") - Date.parse(todayStr() + "T00:00:00Z")) / 864e5);
export const inDays = (d: string) => {
  const n = dayDiff(d);
  return n === 0 ? "اليوم" : n === 1 ? "غداً" : n === -1 ? "أمس" : n > 0 ? `بعد ${n} يوم` : `منذ ${-n} يوم`;
};

export function normCaseNo(v?: string | null) {
  const n = String(v || "").trim().replace(/\s+/g, " ");
  const Y = (y: string) => +y > 1990 && +y < 2100;
  let m = n.match(/^(\d+)\s*[-–/]\s*(\d{4})$/);
  if (m && Y(m[2]) && !(m[1].length === 4 && Y(m[1]) && !Y(m[2]))) return `${m[1]} - ${m[2]}`;
  m = n.match(/^(\d{4})\s*[-–/]\s*(\d+)$/);
  if (m && Y(m[1])) return `${m[2]} - ${m[1]}`;
  return n;
}
export const normCaseType = (v?: string | null) =>
  String(v || "").replace(/\s*[/\\]+\s*/g, " ").replace(/\s{2,}/g, " ").trim();
export const caseRef = (c: { case_no?: string | null; case_type?: string | null }) =>
  [normCaseNo(c.case_no), (c.case_type || "").trim()].filter(Boolean).join(" ");
export const caseNoKey = (c: { case_no?: string | null }) => {
  const m = normCaseNo(c.case_no).match(/^(\d+) - (\d{4})$/);
  return m ? `${m[2]}-${m[1].padStart(8, "0")}` : c.case_no || "";
};

// ---- parties: which side a role belongs to ----
export const ROLES1 = ["المدعي", "الطالب", "المحتكم", "المستأنف", "الطاعن", "المتظلم", "الملتمس", "الشاكي", "المجني عليه", "المؤجر"];
export const ROLES2 = ["المدعى عليه", "المطلوب ضده", "المحتكم ضده", "المستأنف ضده", "المطعون ضده", "المتظلم ضده", "الملتمس ضده", "المشكو في حقه", "المتهم", "المستأجر"];
export const ROLES3 = ["الخصم المتدخل", "الخصم المدخل", "طرف آخر"];
export const normRole = (r?: string | null) =>
  String(r || "").trim().replace(/^(ال)?مدعي$/, "المدعي").replace(/^مدعى عليه$/, "المدعى عليه");
export function roleSide(role: string): 1 | 2 | 3 {
  const k = (x: string) =>
    normRole(x)
      .replace(/\s+/g, " ")
      .replace(/(ضدها|ضدهم|ضدهما)$/, "ضده")
      .replace(/(عليها|عليهم|عليهما)$/, "عليه")
      .replace(/ة(?= |$)/g, "")
      .replace(/(ون|ين|ان)(?= |$)/, "");
  const r = k(role);
  if (ROLES1.some((x) => k(x) === r)) return 1;
  if (ROLES2.some((x) => k(x) === r)) return 2;
  if (/ضده|عليه|في حق|المتهم/.test(r)) return 2;
  if (ROLES1.some((x) => r.startsWith(k(x))) || /^المدع(ي|ين|يان)?$/.test(r)) return 1;
  return 3;
}

// Companies, law offices and authorities are addressed «السادة / ... المحترمين»
export const isOrg = (n: string) =>
  /شركة|شركه|مؤسسة|مؤسسه|مكتب|محاما|محامون|للاستشار|استشارات|قانونيون|هيئة|هيئه|وزارة|وزاره|بنك|مصرف|جهاز|إدارة|ادارة|مجموعة|مجموعه|ذ\.?م\.?م|ش\.?م\.?ق|بصفته/.test(n);
export const addressee = (n: string) => (isOrg(n) ? `السادة / ${n} المحترمين` : `السيد / ${n} المحترم`);

// ---- who assigned the expert (decides letterhead later) ----
export const SRCS = [
  ["court", "مباشرة من المحكمة"],
  ["rent", "لجان فض المنازعات الإيجارية"],
  ["assoc", "جمعية المهندسين"],
  ["panel", "لجنة خبراء"],
] as const;
export type Src = (typeof SRCS)[number][0];
export const srcLabel = (k?: string | null) => SRCS.find((x) => x[0] === k)?.[1] ?? "";
export function detectSrc(c: { authority?: string | null; case_type?: string | null; mission?: string | null; due_note?: string | null; category?: string | null }): Src | "" {
  const t = [c.authority, c.case_type, c.mission, c.due_note].join(" ");
  if (/جمعية\s*المهندسين/.test(t)) return "assoc";
  if (/لجنة\s*(ال)?خبراء|لجنة\s*ثلاثية/.test(t)) return "panel";
  if (/فض\s*المنازعات\s*الإ?يجارية|إيجار|ايجار/.test(t)) return "rent";
  if (c.category === "محكمة") return "court";
  return "";
}
export const srcOf = (c: Parameters<typeof detectSrc>[0] & { assign_src?: string | null }) =>
  c.assign_src === "none" ? "" : c.assign_src || detectSrc(c);

export const money = (n?: number | null) => (n == null ? "—" : `${Number(n).toLocaleString("en-US")} ر.ق`);
export const CATS = ["محكمة", "تحكيم", "خاص", "وساطة", "نيابة"];
