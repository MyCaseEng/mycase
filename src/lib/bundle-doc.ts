// Builds the short bundle in Word: the standard form, its {{TABLE}} replaced by the index and its picture by the QR code.
import { fillTemplateEx, bufToB64, xmlEsc } from "@/lib/docx";
import { accentSwap, common } from "@/lib/forms";
import type { OfficeInfo } from "@/lib/docs";
import type { Case } from "@/lib/cases";
import { qrPng } from "@/lib/qr";
import { sortItems, showDate, type BundleItem } from "@/lib/bundle";

const LINE = "C9B99E", HEAD = "EFE6D8";
// right to left on the page: no. | document | date | handed in by
const COLS = [700, 4600, 1600, 2100];

const run = (t: string, b = false) =>
  `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>${b ? "<w:b/><w:bCs/>" : ""}<w:rtl/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${xmlEsc(t)}</w:t></w:r>`;
const p = (t: string, o: { b?: boolean; center?: boolean } = {}) =>
  `<w:p><w:pPr><w:bidi/><w:spacing w:before="0" w:after="0" w:line="300" w:lineRule="auto"/><w:jc w:val="${o.center ? "center" : "lowKashida"}"/></w:pPr>${run(t, o.b)}</w:p>`;
const cell = (w: number, body: string, o: { head?: boolean; merge?: "restart" | "continue" } = {}) =>
  `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${o.merge ? `<w:vMerge${o.merge === "restart" ? ' w:val="restart"' : ""}/>` : ""}${o.head ? `<w:shd w:val="clear" w:color="auto" w:fill="${HEAD}"/>` : ""}<w:tcMar><w:top w:w="70" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>${body}</w:tc>`;

export function bundleTable(c: Case, items: BundleItem[]) {
  const rows = sortItems(c, items);
  const b = `w:val="single" w:sz="6" w:space="0" w:color="${LINE}"`;
  let x = `<w:tbl><w:tblPr><w:bidiVisual/><w:tblW w:w="9000" w:type="dxa"/><w:tblBorders><w:top ${b}/><w:left ${b}/><w:bottom ${b}/><w:right ${b}/><w:insideH ${b}/><w:insideV ${b}/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${COLS.map((w) => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>`;
  x += `<w:tr><w:trPr><w:tblHeader/></w:trPr>${["الرقم", "المستند", "تاريخ المستند", "تم تزويدنا بها من قبل"].map((h, i) => cell(COLS[i], p(h, { b: true, center: true }), { head: true })).join("")}</w:tr>`;
  rows.forEach((r, i) => {
    // the same provider on consecutive rows of one group shares one merged cell, as in the office's bundles
    const same = (a?: BundleItem) => !!a && a.grp === r.grp && a.provider === r.provider;
    const merge = same(rows[i - 1]) ? "continue" : same(rows[i + 1]) ? "restart" : undefined;
    x += `<w:tr><w:trPr><w:cantSplit/></w:trPr>${cell(COLS[0], p(String(i + 1), { center: true }))}${cell(COLS[1], p(r.title))}${cell(COLS[2], p(showDate(r.doc_date), { center: true }))}${cell(COLS[3], merge === "continue" ? p("") : p(r.provider, { center: true }), { merge })}</w:tr>`;
  });
  if (!rows.length) x += `<w:tr>${COLS.map((w) => cell(w, p(""))).join("")}</w:tr>`;
  return x + "</w:tbl>";
}

export async function bundleDocx(c: Case, office: OfficeInfo, items: BundleItem[], link: string) {
  const res = await fetch("/forms/bundle.docx");
  if (!res.ok) throw new Error("تعذّر تحميل نموذج الحافظة، أعد المحاولة.");
  const url = link.trim();
  return fillTemplateEx(
    bufToB64(await res.arrayBuffer()),
    { ...common(c, office), LINK: url || "……………………………………" },
    { raw: { TABLE: bundleTable(c, items) }, png: url ? await qrPng(url, 10) : undefined, swap: accentSwap(office.country) }
  );
}
