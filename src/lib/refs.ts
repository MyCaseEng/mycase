// Reference-number categories and format, ported from the prototype.
// A number looks like "م ع/007/س أ/26": office prefix / sequence / category code / two-digit year.

// Platform-wide document types and their letter codes, used in the reference number (neutral; the same for every office).
export const REG_CATS: [string, string][] = [
  ["إخطار بدء المأمورية", "إخ"],
  ["أسئلة واستفسارات", "أس"],
  ["محضر اجتماع", "اج"],
  ["محضر معاينة", "مع"],
  ["طلب تأجيل", "تأ"],
  ["طلب إعادة تقدير الأمانة", "أم"],
  ["طلب تأجيل وإعادة تقدير الأمانة", "تأم"],
  ["محضر استلام مستندات", "اس"],
  ["محضر تسليم مستندات", "تس"],
  ["تقرير خبرة", "تق"],
  ["تقرير تكميلي", "تك"],
  ["كتاب", "كت"],
  ["أخرى", "أخ"],
];
export const regCode = (cat: string) => REG_CATS.find((c) => c[0] === cat)?.[1] ?? "";
export const DEFAULT_PREFIX = "م ع";
// numbers issued before the new system (no stored text) keep their old look
export const fmtRef = (prefix: string, r: { seq: number; category: string; year: number }) =>
  [prefix || DEFAULT_PREFIX, String(r.seq).padStart(3, "0"), regCode(r.category), String(r.year).slice(-2)].filter(Boolean).join("/");
// the number as issued: written once, with the office's pattern, by the database
export const refText = (r: { ref_text?: string | null; seq: number; category: string; year: number }, prefix = "") => r.ref_text || fmtRef(prefix, r);

// The office's own pattern. Tokens the expert can place in any order, with any separators.
export const DEFAULT_PATTERN = "{قيد}/{نوع}/{تسلسل}/{سنة}";
export const REF_TOKENS: [token: string, label: string][] = [
  ["{قيد}", "رقم قيد الخبير"],
  ["{نوع}", "رمز المستند (اج، مع…)"],
  ["{تسلسل}", "التسلسل (001)"],
  ["{سنة}", "السنة (2026)"],
  ["{سنة2}", "السنة مختصرة (26)"],
  ["{رقم_الدعوى}", "رقم الدعوى"],
];
// the same formatting as the database's format_ref(), for the live preview in settings
export function formatRef(pattern: string, v: { reg?: string; cat: string; seq: number; year: number; caseNo?: string }) {
  let t = (pattern || DEFAULT_PATTERN).trim();
  t = t.split("{قيد}").join((v.reg ?? "").trim()).split("{نوع}").join(regCode(v.cat) || v.cat).split("{تسلسل}").join(String(v.seq).padStart(3, "0"));
  t = t.split("{سنة2}").join(String(v.year).slice(-2)).split("{سنة}").join(String(v.year)).split("{رقم_الدعوى}").join((v.caseNo ?? "").trim());
  return t.replace(/([/\-_.])\s*(\1\s*)+/g, "$1").replace(/^\s*[/\-_.]\s*|\s*[/\-_.]\s*$/g, "").trim();
}

export type Ref = {
  id: string;
  year: number;
  seq: number;
  category: string;
  case_id: string | null;
  event_id: string | null;
  title: string | null;
  status: "فعال" | "ملغى";
  issued_by: string | null;
  issued_at: string;
  ref_text?: string | null;
};

// Default expert questions (contracting cases), from the office's letter template.
export const QTPL_DEFAULT: Record<string, string[]> = {
  مقاولات: [
    "ما هي طبيعة العلاقة الواقعية بين طرفي التداعي؟ مع ارفاق ما يثبت ذلك من مستندات.",
    "ماهية الأعمال المتفق عليها بين طرفي التداعي وما هي قيمتها؟ مع ارفاق ما يثبت ذلك من مستندات.",
    "ما هي قيمة المبالغ المسددة وغير المسددة من جانب المدعى عليه؟ مع تزويدنا بجدول تفصيلي يوضح الدفعات المسددة وبيان الدفعة وتاريخ استحقاق كل دفعة والتاريخ الفعلي لسدادها، مع ارفاق ما يثبت ذلك من شيكات وسندات القبض وكشف الحساب البنكي...",
    "ما هي الأعمال المنفذة بشكل تفصيلي ؟ وما هي الأعمال غير المنفذة من المدعية؟ وما هي قيمة ما تم تنفيذه من أعمال ؟ وما هي نسبة إنجاز تلك الأعمال ؟ مع ارفاق ما يثبت ذلك من تقارير وفواتير وغيرها من المستندات...",
    "بيان عما إذا كانت الأعمال المنفذة من المدعية قد نفذت وفقاً للأصول الفنية والهندسية المتعارف عليها من عدمه، وفي الحالة الثانية بيان ماهية الأعمال المعيبة مع تقدير قيمة إصلاحها؟ وفي الحالتين ارفاق ما يثبت ذلك من تقارير المطابقة أو تقارير عدم المطابقة، وارفاق قائمة تفصيلية بالأعمال المعيبة وصورها والمستندات الدالة عليها، وما هي قيمة إصلاح تلك الأعمال المعيبة وفقا لتقديركم؟",
    "هل هناك أعمال إضافية منفذة في المشروع؟ وهل تم الاتفاق عليها ؟ وفي الحالة الأولى ما هي تلك الأعمال الإضافية بالتفصيل ؟ وما هي قيمتها ؟ مع ارفاق ما يثبت ذلك من أوامر الشراء، والأوامر التغييرية، والملاحق، وغيرها من المستندات...",
    "هل الأعمال المنفذة تمت في المدة المتفق عليها؟ وفي الحالة الثانية ما هي الأسباب التي أدت إلى التأخير في إتمام الأعمال ؟ وما هي مدة التأخير ؟ ومن المتسبب في التأخير ؟ مع تقديم ما يثبت ذلك من خطابات ومراسلات وغيرها من المستندات....",
    "هل السقالات والمعدات التابعة للمدعية لا تزال متواجدة في حيازة المدعى عليه ؟ وفي الحالة الأولى ما هي القيمة الحالية لتلك السقالات ؟ مع ارفاق ما يثبت ذلك من مستندات.",
    "هل لديكم أية أقوال أو مستندات تودون إضافتها؟",
  ],
};

// For display in Arabic (right-to-left) text: each part keeps its place, so reading from the right gives
// registration no / code / sequence / year, with the year last. Without the marks, «002/2026» would join into one run.
export const showRef = (t: string) => t.replace(/\s*([/\-_.])\s*/g, "\u200F$1\u200F");
