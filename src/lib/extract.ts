import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { PDFDocument } from "pdf-lib";
import { normCaseNo, normCaseType, normRole, roleSide, CATS } from "@/lib/format";

// Reads a whole court file (often a bundle: statement of claim, memos, documents AND the preliminary judgment
// somewhere inside) and returns the case data. The judgment is the primary source, wherever it sits in the file.

const PROMPT = `أنت تساعد مكتب خبرة هندسية في قطر على تسجيل الدعاوى التي ترد إليه من المحاكم واللجان والنيابة وهيئات التحكيم.
المرفق ملف PDF قد يكون مجمّعاً: صحيفة افتتاح الدعوى ومذكرات ومستندات، ومعها الحكم التمهيدي أو قرار ندب الخبير في أي موضع من الملف (أوله أو وسطه أو آخره)، وقد تليه محاضر جلسات لاحقة.

اقرأ كل صفحات الملف. قواعد مهمة:
- إذا وُجد حكم تمهيدي أو قرار ندب خبير فهو المرجع الأول: خذ منه رقم الدعوى ونوعها والجهة والدائرة والقاضي وأمين السر وتاريخ الحكم والجلسات والأمانة والمهلة والأطراف وصفاتهم. لا تعتمد على صحيفة الدعوى إلا فيما لم يرد في الحكم (مثل الهواتف والإيميلات وقيمة المطالبة).
- ابحث عن تواريخ الجلسات في كل الصفحات، وغالباً ترد في آخر منطوق الحكم بعبارة مثل «وحددت جلسة … لنظر الدعوى» أو «لجلسة … لسداد الأمانة»، أو في محاضر الجلسات اللاحقة. سجّل كل الجلسات التي تجدها حتى القديمة.
- رقم الدعوى بصيغة «الرقم - السنة» مثل 05617 - 2026. ابحث عنه في الترويسة والأختام والملصقات ورقم القيد والباركود المكتوب. إذا كان الملف صحيفة افتتاح دعوى لم يُقيَّد لها رقم فاتركه فارغاً واذكر ذلك في warnings.
- نوع الدعوى (caseType) هو نوعها أو رمزها كما ورد (مثل FIINCCRDSP أو ابتدائي مدني كلي)، وليس اسم الوثيقة (لا تكتب «صحيفة افتتاح دعوى» أو «حكم تمهيدي»). بدون شرطات مائلة.
- التواريخ ميلادية YYYY-MM-DD. إذا ورد التاريخ هجرياً فقط فحوّله واذكر ذلك في warnings.
- الأرقام أرقام JSON بلا فواصل ولا عملة.
- لا تخترع معلومة غير موجودة: اترك الحقل "" أو null أو مصفوفة فارغة.
- انقل الأسماء كما وردت بالعربية بدون تصحيح، وأرقام الهواتف والإيميلات كما وردت.
- كل طرف في عنصر مستقل في parties، بترتيب ورودهم: الطرف الأول ثم الثاني ثم أي أطراف أخرى (خصوم مدخلون ومتدخلون).

أعد كائن JSON واحداً فقط، بلا أي نص قبله أو بعده، بهذا الشكل:
{
 "category": "محكمة" | "تحكيم" | "خاص" | "وساطة" | "نيابة",
 "authority": "الجهة كما وردت، مثل: محكمة الاستثمار والتجارة / المحكمة الابتدائية / لجان فض المنازعات الإيجارية",
 "caseType": "",
 "caseNo": "",
 "mission": "رقم المأمورية أو ملف الخبرة إن وجد",
 "circuit": "الدائرة",
 "judge": "القاضي أو رئيس الدائرة",
 "secretary": "أمين السر",
 "parties": [{"role": "الصفة حرفياً", "name": "", "kind": "شركة" | "رجل" | "امرأة" | "جهة حكومية", "phone": "", "email": "", "lawyer": "المحامي أو مكتب المحاماة", "lawyerPhone": "", "lawyerEmail": ""}],
 "received": "YYYY-MM-DD تاريخ الوثيقة أو الورود",
 "prelimDate": "YYYY-MM-DD تاريخ الحكم التمهيدي أو قرار الندب",
 "sessions": [{"date": "YYYY-MM-DD", "note": "الغرض من الجلسة كما ورد"}],
 "deadline": "YYYY-MM-DD موعد نهائي لإيداع التقرير إن ذُكر",
 "dueNote": "المهلة كما وردت نصاً",
 "depositOrdered": null,
 "claimValue": null,
 "projectValue": null,
 "supplementary": false,
 "judgmentPages": "أرقام صفحات الحكم التمهيدي في الملف، مثل 9-11، أو فارغ",
 "summary": "سطران أو ثلاثة: موضوع النزاع والمأمورية المطلوبة من الخبير",
 "warnings": "أي حقل لم تتأكد منه أو لم تجده، أو فارغ"
}`;

export type Extracted = {
  category: string;
  authority: string;
  case_type: string;
  case_no: string;
  mission: string;
  circuit: string;
  judge: string;
  secretary: string;
  received: string;
  prelim_date: string;
  deadline: string;
  due_note: string;
  deposit_ordered: number | null;
  claim_value: number | null;
  project_value: number | null;
  supplementary: boolean;
  parties: { role: string; side: 1 | 2 | 3; name: string; kind: string; phone: string; email: string; lawyer: string; lawyer_phone: string; lawyer_email: string }[];
  sessions: { date: string; note: string }[];
  judgmentPages: string;
  summary: string;
  warnings: string;
};

const str = (v: unknown) => (v == null ? "" : String(v).trim());
const dt = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(str(v)) ? str(v) : "");
const num = (v: unknown) => {
  if (v == null || v === "") return null;
  const x = Number(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(x) ? x : null;
};
const em = (v: unknown) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str(v)) ? str(v) : "");
const ph = (v: unknown) => (str(v).replace(/\D/g, "").length >= 7 ? str(v) : "");
const DOC_NAMES = /^(صحيفة|حكم|قرار|محضر|إشعار|اشعار|مذكرة)/;

export function cleanExtract(x: Record<string, unknown>): Extracted {
  const parties = (Array.isArray(x.parties) ? x.parties : []).map((p: Record<string, unknown>) => {
    const role = normRole(str(p?.role) || "طرف آخر");
    return {
      role,
      side: roleSide(role),
      name: str(p?.name),
      kind: ["شركة", "رجل", "امرأة", "جهة حكومية"].includes(str(p?.kind)) ? str(p?.kind) : "",
      phone: ph(p?.phone),
      email: em(p?.email),
      lawyer: str(p?.lawyer),
      lawyer_phone: ph(p?.lawyerPhone),
      lawyer_email: em(p?.lawyerEmail),
    };
  }).filter((p) => p.name);
  const caseType = normCaseType(str(x.caseType));
  return {
    category: CATS.includes(str(x.category)) ? str(x.category) : "محكمة",
    authority: str(x.authority),
    case_type: DOC_NAMES.test(caseType) ? "" : caseType,
    case_no: normCaseNo(str(x.caseNo)),
    mission: str(x.mission),
    circuit: str(x.circuit),
    judge: str(x.judge),
    secretary: str(x.secretary),
    received: dt(x.received),
    prelim_date: dt(x.prelimDate),
    deadline: dt(x.deadline),
    due_note: str(x.dueNote),
    deposit_ordered: num(x.depositOrdered),
    claim_value: num(x.claimValue),
    project_value: num(x.projectValue),
    supplementary: x.supplementary === true,
    parties,
    sessions: (Array.isArray(x.sessions) ? x.sessions : []).map((s: Record<string, unknown>) => ({ date: dt(s?.date), note: str(s?.note) })).filter((s) => s.date),
    judgmentPages: str(x.judgmentPages),
    summary: str(x.summary),
    warnings: str(x.warnings),
  };
}

const LOCATE_PROMPT = (from: number, to: number) => `هذا جزء من ملف دعوى (الصفحات ${from} إلى ${to} من الملف الأصلي؛ الصفحة الأولى هنا هي الصفحة ${from}).
مهمتك فقط تحديد أرقام الصفحات المهمة (بأرقام الملف الأصلي):
- judgment: صفحات الحكم التمهيدي أو قرار ندب الخبير، كلها من الترويسة حتى المنطوق والتوقيع، ومحاضر الجلسات التي تحدد جلسات لاحقة.
- header: الصفحات التي فيها رقم القيد أو رقم الدعوى ونوعها (مثل صفحة القيد أو الغلاف) إن لم تكن ضمن الحكم.
- contacts: الصفحات التي فيها هواتف أو إيميلات الأطراف أو محاميهم (غالباً في صحيفة الدعوى والمذكرات).
أعد JSON فقط: {"judgment":[أرقام], "header":[أرقام], "contacts":[أرقام]}`;

function client() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("مفتاح Claude API غير مضبوط في إعدادات Vercel (ANTHROPIC_API_KEY).");
  return new Anthropic({ apiKey: key });
}
const jsonOf = (text: string) => {
  const j = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  if (!j) throw new Error("لم يُرجع Claude بيانات قابلة للقراءة. أعد المحاولة.");
  return JSON.parse(j);
};
// Sonnet 5.5 always thinks (adaptive) and the thinking shares max_tokens with the answer, so the budget must be
// generous; "low" effort keeps a data-extraction task fast and cheap. Haiku 5.5 can run with thinking disabled.
async function ask(model: string, pdf: Uint8Array, prompt: string, opts: { maxTokens: number; noThinking?: boolean }) {
  const msg = await client().messages.create({
    model,
    max_tokens: opts.maxTokens,
    ...(opts.noThinking ? { thinking: { type: "disabled" as const } } : { output_config: { effort: "low" as const } }),
    messages: [{ role: "user", content: [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: Buffer.from(pdf).toString("base64") } },
      { type: "text", text: prompt },
    ] }],
  });
  const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  if (!text.includes("{")) {
    const why =
      msg.stop_reason === "max_tokens" ? "انتهت مساحة الرد قبل اكتمال الإجابة"
      : msg.stop_reason === "refusal" ? "رفض النموذج قراءة الملف"
      : `سبب التوقف: ${msg.stop_reason}`;
    throw new Error(`لم يُرجع Claude بيانات قابلة للقراءة (${why}). أعد المحاولة، وإن تكرر أرسل هذه الرسالة.`);
  }
  return { text, usage: msg.usage };
}
async function subset(src: PDFDocument, pages: number[]) {
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, pages.map((p) => p - 1));
  copied.forEach((p) => out.addPage(p));
  return out.save();
}

const SMALL = 25; // a short file goes straight to the precise model
const CHUNK = 250; // locator reads big files in chunks of this many pages
const MAX_SELECTED = 40;

// Two stages for long bundles: a cheap model (Haiku) finds the judgment / header / contact pages anywhere in the
// file, then the precise model (Sonnet) reads only those pages. Short files are read whole by the precise model.
export async function extractCase(pdfBase64: string): Promise<Extracted & { pages: number; read: number }> {
  const precise = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
  const cheap = process.env.ANTHROPIC_LOCATOR_MODEL || "claude-haiku-5-5";
  const bytes = Buffer.from(pdfBase64, "base64");
  let src: PDFDocument | null = null;
  try {
    src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  } catch {
    src = null; // unusual PDF: fall back to sending it whole
  }
  const N = src?.getPageCount() ?? 0;

  if (!src || N <= SMALL) {
    const r = await ask(precise, bytes, PROMPT, { maxTokens: 16000 });
    return { ...cleanExtract(jsonOf(r.text)), pages: N, read: N };
  }

  // stage 1: locate
  const found = { judgment: new Set<number>(), header: new Set<number>(), contacts: new Set<number>() };
  for (let from = 1; from <= N; from += CHUNK) {
    const to = Math.min(N, from + CHUNK - 1);
    const part = await subset(src, Array.from({ length: to - from + 1 }, (_, i) => from + i));
    let j: Record<string, unknown> = {};
    try {
      const r = await ask(cheap, part, LOCATE_PROMPT(from, to), { maxTokens: 2000, noThinking: true });
      j = jsonOf(r.text) as Record<string, unknown>;
    } catch {
      // a failed chunk is not fatal: its first and last pages are still read below
      [from, from + 1, to - 1, to].forEach((n) => found.header.add(n));
    }
    (["judgment", "header", "contacts"] as const).forEach((k) =>
      (Array.isArray(j[k]) ? (j[k] as unknown[]) : []).map(Number).filter((n) => n >= from && n <= to).forEach((n) => found[k].add(n))
    );
  }
  // judgment pages plus one page either side (the operative part often spills over); then header; then contacts
  const pick: number[] = [];
  const add = (n: number) => n >= 1 && n <= N && !pick.includes(n) && pick.length < MAX_SELECTED && pick.push(n);
  [...found.judgment].sort((a, b) => a - b).forEach((n) => [n - 1, n, n + 1].forEach(add));
  [...found.header].forEach(add);
  [...found.contacts].sort((a, b) => a - b).forEach(add);
  if (!pick.length) [1, 2, 3, N - 2, N - 1, N].forEach(add);
  const pages = pick.sort((a, b) => a - b);

  // stage 2: extract from the selected pages only
  const excerpt = await subset(src, pages);
  const note = `\n\nملاحظة: المرفق مقتطف من ملف عدده ${N} صفحة، يضم الصفحات رقم ${pages.join("، ")} فقط بهذا الترتيب (اختيرت لأنها تحوي الحكم التمهيدي وبيانات القيد والاتصال). استعمل أرقام الملف الأصلي في judgmentPages.`;
  const r = await ask(precise, excerpt, PROMPT + note, { maxTokens: 16000 });
  const ex = cleanExtract(jsonOf(r.text));
  if (!found.judgment.size) ex.warnings = [ex.warnings, "لم يُعثر على حكم تمهيدي واضح في الملف."].filter(Boolean).join(" ");
  return { ...ex, pages: N, read: pages.length };
}
