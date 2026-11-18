/* eslint-disable @typescript-eslint/no-require-imports */
// MyCase standard forms (platform-wide, approved 2026.11.17).
// Writes public/forms/<kind>.docx. The platform fills the {{KEYS}} with the office's and the case's data
// (src/lib/forms.ts); an office that uploads its own template for a kind overrides the standard one.
//
// Regenerate:  node scripts/forms/build-forms.cjs && python3 scripts/forms/rtl_fix.py public/forms/*.docx
// Needs the `docx` npm package (npm i -D docx). Each {{KEY}} sits whole inside one text run, so the filler finds it.
const fs = require("fs");
const path = require("path");
const D = require("docx");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ShadingType, LevelFormat, Footer, PageNumber, TableLayoutType, TabStopType, LeaderType } = D;

const OUT = path.join(__dirname, "../../public/forms");
const FONT = { ascii: "Arial", hAnsi: "Arial", cs: "Arial" };
// the small touch: an antique-brass accent; the filler swaps BRASS for the office's country accent
const BRASS = "8F6D36";
const LIGHT = "C9B99E";
const SOFT = "F7F2EA";
const INK = "2B2B2B";
const W = 9000; // text width (DXA)
const DOTS = "……………………";

const run = (text, o = {}) => new TextRun({ text, rightToLeft: true, font: FONT, size: o.size ?? 24, sizeComplexScript: o.size ?? 24, bold: !!o.bold, boldComplexScript: !!o.bold, color: o.color });
const para = (text, o = {}) =>
  new Paragraph({
    bidirectional: true,
    // text paragraphs: Arabic «Justify Low»; in a right-to-left paragraph END = the left edge
    alignment: o.center ? AlignmentType.CENTER : o.left ? AlignmentType.END : AlignmentType.LOW_KASHIDA,
    spacing: { before: o.before ?? 0, after: o.after ?? 120, line: 340 },
    numbering: o.num ? { reference: o.num, level: 0 } : undefined,
    border: o.rule
      ? { bottom: { style: BorderStyle.SINGLE, size: 8, color: BRASS, space: 6 } }
      : o.bar
        ? { right: { style: BorderStyle.SINGLE, size: 24, color: BRASS, space: 8 } }
        : undefined,
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: "auto" } : undefined,
    indent: o.bar ? { start: 160 } : undefined,
    keepNext: !!o.keepNext,
    children: (Array.isArray(text) ? text : [text]).map((t) => (typeof t === "string" ? run(t, o) : t)),
  });
const head = (t) => para(t, { bold: true, size: 26, before: 240, after: 120, keepNext: true, bar: true, color: INK });
const ornament = (after = 200) => para([run("━━━━  ", { color: LIGHT, size: 18 }), run("◆", { color: BRASS, size: 18 }), run("  ━━━━", { color: LIGHT, size: 18 })], { center: true, after });

const letterhead = () => [
  para("{{LH_OFFICE}}", { center: true, bold: true, size: 32, after: 40, color: INK }),
  para("{{LH_LINE2}}", { center: true, size: 22, after: 40, color: "555555" }),
  para("{{LH_LINE3}}", { center: true, size: 20, after: 240, color: "777777", rule: true }),
];

const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NOB = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };
// date on the right edge, reference number on the far left edge of the same line
const dateRef = () => [
  new Table({
    visuallyRightToLeft: true,
    width: { size: W, type: WidthType.DXA },
    columnWidths: [W / 2, W / 2],
    borders: NOB,
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: [
          new TableCell({ width: { size: W / 2, type: WidthType.DXA }, borders: NOB, children: [para("التاريخ: {{DATE}}", { after: 0 })] }),
          new TableCell({ width: { size: W / 2, type: WidthType.DXA }, borders: NOB, children: [para("الرقم المرجعي: {{REF}}", { left: true, after: 0 })] }),
        ],
      }),
    ],
  }),
  para("", { after: 160 }),
];

// «الخبير الهندسي / فلان بن فلان» — built by the platform from the office's expertise and the expert's name
const signLines = () => [para("{{SIGN}}", { left: true, bold: true, after: 40 }), para("التوقيع: " + DOTS, { left: true })];
const signature = () => [para("وتفضلوا بقبول فائق الاحترام،", { before: 240, after: 360 }), ...signLines()];
const partiesBlock = () => [para("{{P1}}", { center: true, bold: true, after: 40 }), para("ضد", { center: true, after: 40 }), para("{{P2}}", { center: true, bold: true })];

function table(headers, rows, widths, rowH) {
  const ws = widths ?? headers.map(() => Math.floor(W / headers.length));
  const total = ws.reduce((a, b) => a + b, 0);
  const cell = (t, h, w) =>
    new TableCell({
      width: { size: w, type: WidthType.DXA },
      shading: h ? { type: ShadingType.CLEAR, fill: "EFE6D8", color: "auto" } : undefined,
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      children: [para(t, { bold: h, size: 22, after: 0, center: h })],
    });
  const line = { style: BorderStyle.SINGLE, size: 6, color: LIGHT };
  return new Table({
    visuallyRightToLeft: true,
    layout: TableLayoutType.FIXED,
    borders: { top: line, bottom: line, left: line, right: line, insideHorizontal: line, insideVertical: line },
    width: { size: total, type: WidthType.DXA },
    columnWidths: ws,
    rows: [headers, ...rows].map((r, i) => new TableRow({ tableHeader: i === 0, height: rowH && i ? { value: rowH, rule: "atLeast" } : undefined, children: r.map((t, k) => cell(t, i === 0, ws[k])) })),
  });
}
const gap = () => para("", { after: 80 });
// a white square; the platform swaps it for the QR code of the bundle link
const QR_PLACEHOLDER = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC", "base64");
const signRow = (a, b) => table([a, b], [["الاسم: " + DOTS, "الاسم: " + DOTS], ["التوقيع: " + DOTS, "التوقيع: " + DOTS]], [4500, 4500]);
// those present: whoever attends for each party (a company sends whoever represents it), plus spare rows
const attendees = () =>
  table(
    ["الاسم", "رقم البطاقة الشخصية", "الصفة", "رقم الهاتف", "التوقيع"],
    Array.from({ length: 6 }, () => ["", "", "", "", ""]),
    [2300, 1800, 1900, 1500, 1500],
    560
  );
// lines to write on by hand: a dotted line from the very start of the line to its very end
const writingLines = (n) =>
  Array.from({ length: n }, () =>
    new Paragraph({
      bidirectional: true,
      spacing: { before: 0, after: 200, line: 340 },
      tabStops: [{ type: TabStopType.END, position: W, leader: LeaderType.DOT }],
      children: [new TextRun({ text: "\t", rightToLeft: true, font: FONT, size: 24 })],
    })
  );
// end of the minutes: the expert signs on the right, those present sign on the left
function signBoth() {
  const half = W / 2;
  const cell = (kids) => new TableCell({ width: { size: half, type: WidthType.DXA }, borders: NOB, children: kids });
  return [
    para("", { after: 240 }),
    new Table({
      visuallyRightToLeft: true,
      layout: TableLayoutType.FIXED,
      width: { size: W, type: WidthType.DXA },
      columnWidths: [half, half],
      borders: NOB,
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            cell([para("{{SIGN}}", { bold: true, after: 60 }), para("التوقيع: " + DOTS, { after: 0 })]),
            cell([para("توقيع الحاضرين", { bold: true, left: true, after: 60 }), ...[1, 2, 3].map(() => para(DOTS + "………", { left: true, after: 120 }))]),
          ],
        }),
      ],
    }),
  ];
}
const toParty = () => [para("{{TO_LINE}}", { bold: true, after: 40 }), para("{{TO_SUB}}", { after: 240 })];
const toCourt = () => [para("{{COURT_LINE}}", { bold: true, after: 40 }), para("{{COURT_SUB}}", { after: 240 })];
const subject = (t) => para("الموضوع: " + t, { bold: true, after: 220, bar: true, fill: SOFT });
const hello = () => para("تحية طيبة وبعد،", { after: 160 });
const title = (t, sub) => [para(t, { center: true, bold: true, size: 34, after: 40, color: INK }), ornament(80), para(sub, { center: true, after: 240, color: "555555" })];
const PRELIM_OPEN = "بالإشارة إلى الحكم التمهيدي الصادر بتاريخ {{PRELIM}} بندبنا خبيراً في الدعوى المذكورة أعلاه، القائمة بين:";

const FORMS = {
  // 01
  start: () => [
    ...dateRef(), ...toParty(),
    subject("استلام التكليف وبدء أعمال الخبرة في الدعوى رقم {{CASE_NO}}"), hello(),
    para("نُفيدكم بأنه ورد إلينا بتاريخ {{RECEIVED}} تكليفٌ من {{AUTH}} بمباشرة أعمال الخبرة في الدعوى المذكورة أعلاه، القائمة بين:"),
    ...partiesBlock(),
    para("وقد بدأنا دراسة ملف الدعوى تمهيداً لتنفيذ المأمورية المحددة في الحكم التمهيدي، وسنوافيكم بمواعيد الاجتماعات والمعاينة في حينها.", { before: 160 }),
    para("لذا نرجو منكم تزويدنا، خلال {{DAYS}} من تاريخه، بما يلي:"),
    para("مذكرة موجزة بموقفكم في الدعوى وطلباتكم.", { num: "n1" }),
    para("المستندات التي تؤيد موقفكم، مرتبة ومرقّمة مع فهرس بها.", { num: "n1" }),
    para("بيانات التواصل المعتمدة (الهاتف والبريد الإلكتروني)، واسم من يمثلكم أمام الخبير مع سند التفويض.", { num: "n1" }),
    para("{{CONTACT_LINE}}", { before: 120 }),
    ...signature(),
  ],
  // 02
  questions: () => [
    ...dateRef(), ...toParty(),
    subject("أسئلة واستفسارات الخبير في الدعوى رقم {{CASE_NO}}"), hello(),
    para("في إطار المأمورية المسندة إلينا من {{AUTH}} في الدعوى المذكورة أعلاه، وبعد الاطلاع على ملف الدعوى، نرجو منكم الإجابة كتابةً عن الأسئلة التالية، مع إرفاق المستندات التي تؤيد كل إجابة:"),
    para("{{Q}}", { num: "n2" }),
    para("ونرجو مراعاة ما يلي:", { before: 160 }),
    para("أن تكون الإجابة بالترتيب نفسه، وأن يُشار أمام كل إجابة إلى رقم المستند الذي يؤيدها.", { num: "b" }),
    para("أن تُقدَّم المستندات مرتبة ومرقّمة مع فهرس بها، ونسخة إلكترونية منها إن أمكن.", { num: "b" }),
    para("أن تُرسَل الإجابة خلال {{DAYS}} من تاريخ هذا الخطاب، أي في موعد أقصاه {{DUE}}.", { num: "b" }),
    para("علماً بأن عدم الرد خلال المهلة المحددة سيُشار إليه في تقرير الخبرة، وستباشر الخبرة أعمالها بناءً على ما هو متاح من مستندات.", { before: 120 }),
    ...signature(),
  ],
  // 03
  meeting: () => [
    ...title("محضر اجتماع رقم {{MEET_NO}}", "في الدعوى رقم {{CASE_NO}} — {{AUTH}}"),
    para("في يوم {{DAY}} الموافق {{EV_DATE}}، على الساعة {{TIME}}، انعقد الاجتماع في {{PLACE}} بدعوة من الخبير المنتدَب، تنفيذاً للمأمورية المحددة في الحكم التمهيدي الصادر بتاريخ {{PRELIM}}."),
    head("أولاً: الحاضرون"), attendees(),
    head("ثانياً: تفاصيل الاجتماع"),
    ...writingLines(14),
    para("وأُغلق المحضر على الساعة " + DOTS + "، وقُرئ على الحاضرين فوقّعوا عليه.", { before: 160 }),
    ...signBoth(),
  ],
  // 04
  inspection: () => [
    ...title("محضر معاينة", "في الدعوى رقم {{CASE_NO}} — {{AUTH}}"),
    para("في يوم {{DAY}} الموافق {{EV_DATE}}، على الساعة {{TIME}}، انتقل الخبير المنتدَب إلى {{PLACE}} لمعاينة {{TOPIC}}، تنفيذاً للمأمورية المحددة في الحكم التمهيدي، وذلك بعد إخطار الأطراف بتاريخ {{NOTIFIED}}."),
    head("أولاً: الحاضرون"), attendees(),
    head("ثانياً: تفاصيل المعاينة"),
    ...writingLines(14),
    para("وانتهت المعاينة على الساعة " + DOTS + "، وقُرئ المحضر على الحاضرين فوقّعوا عليه.", { before: 160 }),
    ...signBoth(),
  ],
  // 05
  postpone: () => [
    ...dateRef(), ...toCourt(),
    subject("طلب تأجيل موعد إيداع تقرير الخبرة في الدعوى رقم {{CASE_NO}}"), hello(),
    para(PRELIM_OPEN), ...partiesBlock(),
    para("والمحدد لنظرها جلسة {{HEARING}}، نفيد بأن أعمال الخبرة لا تزال جارية، وقد أُنجز منها حتى تاريخه ما يلي:", { before: 160 }),
    para("{{PROC}}", { num: "b" }),
    para("ونظراً لـ {{REASON}}، فإننا نلتمس من عدالتكم تأجيل موعد إيداع التقرير مدة {{PERIOD}}، حتى يتسنى لنا استكمال أعمال المأمورية على الوجه المطلوب.", { before: 120 }),
    ...signature(),
  ],
  // 06
  deposit: () => [
    ...dateRef(), ...toCourt(),
    subject("طلب إعادة تقدير أمانة الخبرة في الدعوى رقم {{CASE_NO}}"), hello(),
    para(PRELIM_OPEN), ...partiesBlock(),
    para("والذي قدّر أمانة الخبرة بمبلغ {{DEPOSIT}}، نفيد بأننا بعد دراسة ملف الدعوى وبنود المأمورية تبيّن لنا أن هذه الأمانة لا تتناسب مع حجم العمل المطلوب، وذلك للأسباب التالية:", { before: 160 }),
    para("{{REASONS}}", { num: "n3" }),
    para("لذا نلتمس من عدالتكم إعادة تقدير الأمانة لتصبح {{NEW_DEPOSIT}}، وإلزام {{PAYER}} بسداد الفرق وقدره {{DIFF}}.", { before: 120 }),
    ...signature(),
  ],
  // 07
  both: () => [
    ...dateRef(), ...toCourt(),
    subject("طلب تأجيل موعد إيداع التقرير وإعادة تقدير الأمانة في الدعوى رقم {{CASE_NO}}"), hello(),
    para(PRELIM_OPEN), ...partiesBlock(),
    para("والمحدد لنظرها جلسة {{HEARING}}، والمقدّرة أمانتها بمبلغ {{DEPOSIT}}، نفيدكم بما يلي:", { before: 160 }),
    para([run("أولاً: الأمانة. ", { bold: true }), run("تبيّن لنا بعد دراسة الملف أن الأمانة المقررة لا تتناسب مع حجم المأمورية، وذلك لـ {{REASON_DEP}}. لذا نلتمس إعادة تقديرها لتصبح {{NEW_DEPOSIT}}، وإلزام {{PAYER}} بسداد الفرق وقدره {{DIFF}}.")]),
    para([run("ثانياً: موعد الإيداع. ", { bold: true }), run("نظراً لما تقدّم{{REASON_EXTRA}}، نلتمس تأجيل موعد إيداع التقرير مدة {{PERIOD}} تبدأ من تاريخ سداد فرق الأمانة.")]),
    ...signature(),
  ],
  // 08
  receipt: () => [
    ...title("محضر استلام مستندات", "في الدعوى رقم {{CASE_NO}} — {{AUTH}}"),
    para("في يوم {{DAY}} الموافق {{EV_DATE}}، استلم مكتب الخبير المنتدَب من " + DOTS + "، بصفته " + DOTS + "، المستندات التالية:"),
    table(["م", "بيان المستند", "أصل / صورة", "ورقي / إلكتروني", "عدد الصفحات"], [["1", DOTS, "……", "……", "……"], ["2", DOTS, "……", "……", "……"], ["3", DOTS, "……", "……", "……"], ["4", DOTS, "……", "……", "……"]], [700, 3900, 1400, 1600, 1400]),
    para("مجموع المستندات: …… مستنداً، في …… صفحة.", { before: 160 }),
    para("ويُقرّ المُسلِّم بأن هذه المستندات مقدّمة لغرض أعمال الخبرة في الدعوى المذكورة، وأن الأصول منها تُعاد إليه بعد انتهاء المأمورية بموجب محضر تسليم."),
    gap(), signRow("المُسلِّم", "المُستلِم عن المكتب"),
  ],
  // 09
  handover: () => [
    ...title("محضر تسليم مستندات", "في الدعوى رقم {{CASE_NO}} — {{AUTH}}"),
    para("في يوم {{DAY}} الموافق {{EV_DATE}}، سلّم مكتب الخبير المنتدَب إلى " + DOTS + "، بصفته " + DOTS + "، المستندات التالية:"),
    table(["م", "بيان المستند", "أصل / صورة", "تاريخ استلامه أصلاً", "عدد الصفحات"], [["1", DOTS, "……", "……", "……"], ["2", DOTS, "……", "……", "……"], ["3", DOTS, "……", "……", "……"]], [700, 3800, 1400, 1700, 1400]),
    para("ويُقرّ المُستلِم باستلام المستندات المذكورة أعلاه كاملة وبحالتها التي سُلّمت بها.", { before: 160 }),
    gap(), signRow("المُسلِّم عن المكتب", "المُستلِم"),
  ],
  // 11 — the short documents bundle: index on the first page, the download link and its QR code on the second.
  // {{TABLE}} is replaced by the index table and the placeholder picture by the QR code (src/lib/bundle-doc.ts).
  bundle: () => [
    ...title("حافظة المستندات", "لتقرير الخبرة في الدعوى رقم {{CASE_NO}}"),
    para("المقدَّمة إلى {{AUTH}}", { center: true, after: 160 }),
    para("{{P1}}", { center: true, bold: true, after: 40 }),
    para("ضد", { center: true, after: 40 }),
    para("{{P2}}", { center: true, bold: true, after: 200 }),
    head("فهرس المستندات"),
    para("{{TABLE}}", { after: 0 }),
    new Paragraph({ bidirectional: true, pageBreakBefore: true, children: [] }),
    ...title("رابط تحميل المستندات", "الحافظة الكاملة لمستندات الدعوى ومرفقاتها"),
    para("{{LINK}}", { center: true, bold: true, before: 200, after: 360, color: BRASS }),
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [new D.ImageRun({ type: "png", data: QR_PLACEHOLDER, transformation: { width: 200, height: 200 } })],
    }),
    para("امسح الرمز بكاميرا الجوال لفتح رابط التحميل مباشرة", { center: true, size: 20, color: "777777" }),
  ],
  // 10
  report: () => [
    ...title("تقرير الخبرة", "في الدعوى رقم {{CASE_NO}}"),
    para("المقدّم إلى {{AUTH}}{{CIRCUIT}}", { center: true, after: 40 }),
    ...dateRef(),
    head("الفصل الأول: المقدمة"),
    para("بيانات الدعوى: {{CASE_INFO}}", { num: "n4" }),
    para("أطراف الدعوى وممثلوهم: {{PARTIES_REP}}", { num: "n4" }),
    para("الحكم التمهيدي: صدر بتاريخ {{PRELIM}}، ومنطوقه فيما يخص الخبرة: " + DOTS, { num: "n4" }),
    para("المأمورية: بنودها كما وردت في الحكم:", { num: "n4" }),
    para("{{MISSION}}", { num: "b" }),
    head("الفصل الثاني: ملخص النزاع"),
    para("موجز الوقائع: " + DOTS, { num: "n5" }),
    para("طلبات {{SIDE1}}: " + DOTS, { num: "n5" }),
    para("دفاع {{SIDE2}}: " + DOTS, { num: "n5" }),
    head("الفصل الثالث: إجراءات الخبرة"),
    para("{{PROC}}", { num: "b" }),
    head("الفصل الرابع: المستندات المقدّمة"),
    para("{{ATT}}", { num: "b" }),
    head("الفصل الخامس: البحث والتحليل"),
    para("تُبحث كل نقطة من نقاط المأمورية بالترتيب، ولكل نقطة: الوقائع الثابتة، وموقف كل طرف منها، والمستندات ذات الصلة، ثم رأي الخبير ومبرراته."),
    para("النقطة 1: " + DOTS, { num: "b" }),
    para("النقطة 2: " + DOTS, { num: "b" }),
    head("الفصل السادس: النتيجة"),
    para("بناءً على ما تقدّم، انتهت الخبرة إلى ما يلي:"),
    para(DOTS, { num: "n6" }),
    para(DOTS, { num: "n6" }),
    para("ويبقى الأمر بعد ذلك لعدالة {{AUTH}} للفصل فيه بما تراه."),
    para([run("المرفقات: ", { bold: true }), run("محاضر الاجتماعات والمعاينة، الصور، المراسلات، وما يراه الخبير لازماً.")], { before: 120 }),
    para("", { after: 240 }),
    ...signLines(),
  ],
};

// numbers and bullets start right at the line's edge (like the text), the item's text a short step after
const numCfg = (ref, fmt) => ({
  reference: ref,
  levels: [{ level: 0, format: fmt, text: fmt === LevelFormat.BULLET ? "•" : "%1.", alignment: AlignmentType.START, style: { paragraph: { indent: { start: 360, hanging: 360 } }, run: { font: "Arial" } } }],
});

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [kind, body] of Object.entries(FORMS)) {
    const doc = new Document({
      styles: { default: { document: { run: { font: "Arial", size: 24, rightToLeft: true } } } },
      numbering: { config: [numCfg("b", LevelFormat.BULLET), ...["n1", "n2", "n3", "n4", "n5", "n6"].map((r) => numCfg(r, LevelFormat.DECIMAL))] },
      sections: [
        {
          properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1100, bottom: 1100, left: 1450, right: 1450 } } },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  bidirectional: true,
                  alignment: AlignmentType.CENTER,
                  border: { top: { style: BorderStyle.SINGLE, size: 4, color: LIGHT, space: 6 } },
                  children: [new TextRun({ children: ["صفحة ", PageNumber.CURRENT, " من ", PageNumber.TOTAL_PAGES], font: FONT, size: 18, rightToLeft: true, color: "888888" })],
                }),
              ],
            }),
          },
          children: [...letterhead(), ...body()],
        },
      ],
    });
    fs.writeFileSync(path.join(OUT, `${kind}.docx`), await Packer.toBuffer(doc));
  }
  console.log("forms written to", OUT);
})();
