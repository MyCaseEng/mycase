// Excel (.xlsx) export, ported from the first platform: right-to-left sheet, office header rows,
// colored column titles, frozen header, filter buttons, printable landscape on one page width.
import { zipStore } from "./docx";
import { fmtD, todayStr } from "./format";

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export type XCol = { h: string; w?: number };

export function buildXlsx({ header, title, cols, rows, color = "8A1538" }: { header: string; title: string; cols: XCol[]; rows: (string | number | null)[][]; color?: string }) {
  const x = (v: unknown) =>
    String(v ?? "")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const cn = (i: number) => {
    let s = "";
    i++;
    while (i > 0) {
      const m = (i - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      i = Math.floor((i - 1) / 26);
    }
    return s;
  };
  const last = cn(cols.length - 1);
  const cell = (v: unknown, r: number, c: number, st: number) => {
    const ref = cn(c) + r;
    if (v == null || v === "") return `<c r="${ref}" s="${st}"/>`;
    if (typeof v === "number" && isFinite(v)) return `<c r="${ref}" s="${st === 4 ? 5 : st}"><v>${v}</v></c>`;
    return `<c r="${ref}" s="${st}" t="inlineStr"><is><t xml:space="preserve">${x(v)}</t></is></c>`;
  };
  const R: string[] = [];
  R.push(`<row r="1" ht="24" customHeight="1">${cell(header, 1, 0, 1)}</row>`);
  R.push(`<row r="2" ht="20" customHeight="1">${cell(`${title}   ·   تاريخ التصدير: ${fmtD(todayStr())}   ·   عدد السجلات: ${rows.length}`, 2, 0, 2)}</row>`);
  R.push(`<row r="4" ht="30" customHeight="1">${cols.map((c, i) => cell(c.h, 4, i, 3)).join("")}</row>`);
  rows.forEach((row, k) => {
    const r = 5 + k;
    R.push(`<row r="${r}">${row.map((v, i) => cell(v, r, i, 4)).join("")}</row>`);
  });
  const lastRow = Math.max(4, 4 + rows.length);
  const sheet =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>` +
    `<sheetViews><sheetView rightToLeft="1" workbookViewId="0" zoomScale="100"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A5" sqref="A5"/></sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="18"/><cols>${cols.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.w || 16}" customWidth="1"/>`).join("")}</cols>` +
    `<sheetData>${R.join("")}</sheetData>${rows.length ? `<autoFilter ref="A4:${last}${lastRow}"/>` : ""}` +
    `<mergeCells count="2"><mergeCell ref="A1:${last}1"/><mergeCell ref="A2:${last}2"/></mergeCells>` +
    `<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
  const styles =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<fonts count="4"><font><sz val="11"/><name val="Arial"/><family val="2"/></font><font><b/><sz val="14"/><color rgb="FF${color}"/><name val="Arial"/><family val="2"/></font><font><sz val="10"/><color rgb="FF6B5E5A"/><name val="Arial"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/><family val="2"/></font></fonts>` +
    `<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF${color}"/><bgColor indexed="64"/></patternFill></fill></fills>` +
    `<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD9CBBE"/></left><right style="thin"><color rgb="FFD9CBBE"/></right><top style="thin"><color rgb="FFD9CBBE"/></top><bottom style="thin"><color rgb="FFD9CBBE"/></bottom><diagonal/></border></borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
    `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center" readingOrder="2"/></xf>` +
    `<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center" readingOrder="2"/></xf>` +
    `<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1" readingOrder="2"/></xf>` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top" wrapText="1" readingOrder="2"/></xf>` +
    `<xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" readingOrder="2"/></xf></cellXfs>` +
    `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const sname = x(String(title).replace(/[\\/?*[\]:]/g, " ").slice(0, 31));
  const qn = "'" + sname.replace(/'/g, "''") + "'";
  return zipStore([
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="${sname}" sheetId="1" r:id="rId1"/></sheets><definedNames>${rows.length ? `<definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">${qn}!$A$4:$${last}$${lastRow}</definedName>` : ""}<definedName name="_xlnm.Print_Titles" localSheetId="0">${qn}!$4:$4</definedName></definedNames></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    { name: "xl/styles.xml", data: styles },
    { name: "xl/worksheets/sheet1.xml", data: sheet },
  ]);
}

export const CASE_COLS: XCol[] = [
  { h: "م", w: 6 }, { h: "رقم الدعوى", w: 16 }, { h: "نوع الدعوى", w: 22 }, { h: "الجهة", w: 24 }, { h: "النوع", w: 10 }, { h: "جهة التكليف", w: 16 },
  { h: "الدائرة", w: 18 }, { h: "القاضي", w: 22 }, { h: "أمين السر", w: 20 },
  { h: "الطرف الأول", w: 34 }, { h: "محامي الطرف الأول", w: 26 }, { h: "الطرف الثاني", w: 34 }, { h: "محامي الطرف الثاني", w: 26 },
  { h: "تاريخ الورود", w: 13 }, { h: "الحكم التمهيدي", w: 13 }, { h: "الموعد القادم", w: 24 }, { h: "الموعد النهائي", w: 13 },
  { h: "الحالة", w: 12 }, { h: "الفريق", w: 20 }, { h: "تاريخ التسليم", w: 13 },
  { h: "الأمانة المقررة", w: 14 }, { h: "قيمة المطالبة", w: 16 }, { h: "قيمة المشروع", w: 16 }, { h: "المسدَّد من الأمانة", w: 16 }, { h: "الأتعاب المصروفة", w: 16 },
];
