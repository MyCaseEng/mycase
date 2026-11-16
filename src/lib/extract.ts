import "server-only";
import Anthropic from "@anthropic-ai/sdk";
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

export async function extractCase(pdfBase64: string): Promise<Extracted> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("مفتاح Claude API غير مضبوط في إعدادات Vercel (ANTHROPIC_API_KEY).");
  const client = new Anthropic({ apiKey: key });
  const msg = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
          { type: "text", text: PROMPT },
        ],
      },
    ],
  });
  const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  if (!json) throw new Error("لم يُرجع Claude بيانات قابلة للقراءة. أعد المحاولة.");
  return cleanExtract(JSON.parse(json));
}
