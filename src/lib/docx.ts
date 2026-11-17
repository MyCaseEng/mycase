// Word (.docx) engine, ported from the prototype. Runs in the browser: unzip the office template,
// replace {{KEY}} placeholders and repeat paragraphs for lists, zip it back (stored, no compression).

const CRC_T = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function zipStore(files: { name: string; data: Uint8Array | string }[]) {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const cen: Uint8Array[] = [];
  let off = 0;
  const u16 = (v: number) => [v & 255, (v >>> 8) & 255];
  const u32 = (v: number) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = typeof f.data === "string" ? enc.encode(f.data) : f.data;
    const crc = crc32(data);
    const lh = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)]);
    parts.push(lh, name, data);
    cen.push(
      new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]),
      name
    );
    off += lh.length + name.length + data.length;
  }
  const cs = cen.reduce((a, b) => a + b.length, 0);
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cs), ...u32(off), ...u16(0)]);
  return new Blob([...parts, ...cen, end] as BlobPart[], { type: DOCX_MIME });
}

async function unzipEntries(buf: ArrayBuffer) {
  const u = new Uint8Array(buf);
  const dv = new DataView(buf);
  let e = u.length - 22;
  while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error("ملف القالب ليس ملف Word صالحاً");
  const n = dv.getUint16(e + 10, true);
  let p = dv.getUint32(e + 16, true);
  const out: { name: string; data: Uint8Array }[] = [];
  const td = new TextDecoder();
  for (let i = 0; i < n; i++) {
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lho = dv.getUint32(p + 42, true);
    const name = td.decode(u.subarray(p + 46, p + 46 + nl));
    const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
    let data: Uint8Array = u.slice(start, start + csize);
    if (method === 8)
      data = new Uint8Array(await new Response(new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
    out.push({ name, data });
    p += 46 + nl + el + cl;
  }
  return out;
}

const xmlEsc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The paragraph holding {{KEY}} is repeated once per item (questions, procedures, attachments…).
function expandParaList(xml: string, key: string, items: string[]) {
  const tag = `{{${key}}}`;
  let guard = 0;
  while (xml.includes(tag) && guard++ < 20) {
    const i = xml.indexOf(tag);
    const s = Math.max(xml.lastIndexOf("<w:p ", i), xml.lastIndexOf("<w:p>", i));
    const e = xml.indexOf("</w:p>", i) + 6;
    if (s < 0 || e < 6) break;
    const para = xml.slice(s, e);
    xml = xml.slice(0, s) + items.map((t) => para.split(tag).join(xmlEsc(t))).join("") + xml.slice(e);
  }
  return xml;
}

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const DOTS = "……………………………………………………………………";

export function b64ToBuf(b64: string) {
  const b = atob(b64);
  const a = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
  return a.buffer;
}
export function bufToB64(buf: ArrayBuffer) {
  const u = new Uint8Array(buf);
  let bin = "";
  for (let k = 0; k < u.length; k += 0x8000) bin += String.fromCharCode.apply(null, Array.from(u.subarray(k, k + 0x8000)));
  return btoa(bin);
}

export async function fillTemplate(templateB64: string, vars: Record<string, string>, lists: Record<string, string[]> = {}, swap: Record<string, string> = {}) {
  const ents = await unzipEntries(b64ToBuf(templateB64));
  const td = new TextDecoder(), te = new TextEncoder();
  for (const en of ents) {
    if (!/^word\/(document|header\d*|footer\d*)\.xml$/.test(en.name)) continue;
    let x = td.decode(en.data);
    for (const [k, items] of Object.entries(lists)) x = expandParaList(x, k, items.length ? items : ["…………………………………………"]);
    x = x.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, k) => (vars[k] != null ? xmlEsc(vars[k]) : ""));
    for (const [a, b] of Object.entries(swap)) x = x.split(a).join(b); // e.g. the accent colour
    en.data = te.encode(x);
  }
  return zipStore(ents);
}

// A plain RTL document built from scratch (used for the procedures export).
export function simpleDocx(title: string, subtitle: string, lines: string[]) {
  const FONT = '<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>';
  const run = (t: string, o: { b?: boolean; sz?: number; color?: string } = {}) =>
    `<w:r><w:rPr>${FONT}${o.b ? "<w:b/><w:bCs/>" : ""}${o.color ? `<w:color w:val="${o.color}"/>` : ""}<w:rtl/><w:sz w:val="${o.sz || 22}"/><w:szCs w:val="${o.sz || 22}"/></w:rPr><w:t xml:space="preserve">${xmlEsc(t)}</w:t></w:r>`;
  const para = (runs: string, center = false) =>
    `<w:p><w:pPr><w:bidi/>${center ? '<w:jc w:val="center"/>' : '<w:jc w:val="both"/>'}<w:spacing w:before="60" w:after="60" w:line="320" w:lineRule="auto"/></w:pPr>${runs}</w:p>`;
  let body = para(run(title, { b: true, sz: 30 }), true) + para(run(subtitle, { sz: 22, color: "5F6B7A" }), true) + para("");
  lines.forEach((l, i) => (body += para(run(`${i + 1}- `, { b: true, sz: 23 }) + run(l, { sz: 23 }))));
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000" w:header="500" w:footer="500" w:gutter="0"/><w:bidi/></w:sectPr></w:body></w:document>`;
  return zipStore([
    { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>` },
    { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
    { name: "word/document.xml", data: doc },
  ]);
}

// ---- Outlook draft (.eml) with the Word letter attached ----
export const b64utf8 = (s: string) => bufToB64(new TextEncoder().encode(s).buffer as ArrayBuffer);
export function buildEml(to: string[], cc: string, subject: string, body: string, att: { name: string; type: string; b64: string }[] = []) {
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<html><head><meta charset="utf-8"></head><body><div dir="rtl" style="font-family:Arial,Tahoma,sans-serif;font-size:11pt;text-align:right">${body
    .split("\n")
    .map((l) => (l.trim() ? esc(l) : "&nbsp;"))
    .join("<br>\n")}</div></body></html>`;
  const wrap = (b: string) => b.replace(/.{1,76}/g, "$&\r\n");
  const B = "----=_mycase_" + Date.now().toString(36);
  const head = ["X-Unsent: 1", "To: " + to.join(", "), cc ? "Cc: " + cc : null, `Subject: =?UTF-8?B?${b64utf8(subject)}?=`, "MIME-Version: 1.0", `Content-Type: multipart/mixed; boundary="${B}"`, ""].filter((x) => x !== null) as string[];
  const parts = ["--" + B, "Content-Type: text/html; charset=UTF-8", "Content-Transfer-Encoding: base64", "", wrap(b64utf8(html))];
  att.forEach((a) =>
    parts.push("--" + B, `Content-Type: ${a.type}; name="=?UTF-8?B?${b64utf8(a.name)}?="`, "Content-Transfer-Encoding: base64", `Content-Disposition: attachment; filename="=?UTF-8?B?${b64utf8(a.name)}?="`, "", wrap(a.b64))
  );
  parts.push("--" + B + "--", "");
  return [...head, ...parts].join("\r\n");
}

export function saveBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
export const safeName = (s: string) => s.replace(/[^\w؀-ۿ\-]+/g, "_").replace(/_+/g, "_");
