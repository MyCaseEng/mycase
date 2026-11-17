// The platform's standard forms (public/forms/<kind>.docx, approved 2026.11.17) and the data that fills them.
// An office that uploads its own Word template for a kind (Settings → Word templates) gets its own instead.
import type { Case, Ev, Party, QLetter } from "@/lib/cases";
import { arTime, dayName, invitedOf, OFFICE_PLACE, partyAddr, procAttsBySide, procLine, procList, qDaysTxt, sideLabel, sideLine, type OfficeInfo, type ProcRow } from "@/lib/docs";
import { DOTS } from "@/lib/docx";
import { caseRef, fmtD, normRole, todayStr } from "@/lib/format";
import { countryName, currencyOf, themeOf } from "@/lib/countries";
import { signLine, specialtyOf } from "@/lib/specialties";
import { showRef } from "@/lib/refs";

export const FORM_KINDS: [kind: string, label: string][] = [
  ["start", "إخطار الأطراف باستلام التكليف وبدء المأمورية"],
  ["questions", "أسئلة واستفسارات الخبير وطلب المستندات المؤيدة"],
  ["meeting", "محضر اجتماع"],
  ["inspection", "محضر معاينة"],
  ["postpone", "طلب تأجيل موعد إيداع تقرير الخبرة"],
  ["deposit", "طلب إعادة تقدير الأمانة"],
  ["both", "طلب تأجيل موعد إيداع التقرير وإعادة تقدير الأمانة"],
  ["receipt", "محضر استلام مستندات"],
  ["handover", "محضر تسليم مستندات"],
  ["report", "تقرير الخبرة"],
];

export type Filled = { kind: string; vars: Record<string, string>; lists: Record<string, string[]> };
const D = DOTS.slice(0, 18);
const or = (v: string | null | undefined) => (v && v.trim() ? v : D);
const amount = (n: number | null | undefined, cur: string) => (n == null || !isFinite(Number(n)) ? D : `${Number(n).toLocaleString("en-US")} ${cur}`);

// letterhead, signature and the case lines shared by every form
export function common(c: Case, office: OfficeInfo, ref = "", date = todayStr()) {
  const cur = currencyOf(office.country)[0];
  return {
    LH_OFFICE: office.name || "",
    LH_LINE2: [office.expertName, specialtyOf(office.specialty).name, office.reg ? `رقم القيد: ${office.reg}` : ""].filter(Boolean).join(" — "),
    LH_LINE3: [office.address, countryName(office.country), office.phone, office.email].filter(Boolean).join(" — "),
    SIGN: signLine(office.specialty, office.expertName),
    DATE: fmtD(date),
    // read from the right: registration no / code / sequence / year (year last)
    REF: ref ? showRef(ref) : "……………",
    CASE_NO: caseRef(c) || D,
    AUTH: c.authority || "الجهة المنتدِبة",
    P1: sideLine(c, 1) || D,
    P2: sideLine(c, 2) || D,
    SIDE1: sideLabel(c, 1),
    SIDE2: sideLabel(c, 2),
    PRELIM: c.prelim_date ? fmtD(c.prelim_date) : D,
    RECEIVED: c.received ? fmtD(c.received) : D,
    COURT_LINE: `السادة / ${c.authority || "المحكمة"} المحترمين`,
    COURT_SUB: [c.circuit, c.judge ? `القاضي: ${c.judge}` : ""].filter(Boolean).join("، "),
    CUR: cur,
  };
}
const toParty = (p: Party, lawyer: boolean) => {
  const a = partyAddr(p, lawyer);
  return { TO_LINE: `${a.title} / ${a.name} ${a.honor}`, TO_SUB: a.agent || `${normRole(p.role)} في الدعوى` };
};
const where = (e: Ev | undefined, office: OfficeInfo) => {
  const p = (e?.place ?? "").trim();
  if (!p) return D;
  if (p === OFFICE_PLACE) return office.address ? `مقر مكتب الخبير الكائن في ${office.address}` : "مقر مكتب الخبير";
  if (/zoom|teams|meet\.google|أونلاين|عن بعد|عن بُعد/i.test(p)) return "اجتماع عن بُعد";
  if (/^https?:\/\//i.test(p)) return "الموقع المحدد في رابط الخريطة المرسل للأطراف";
  return p;
};

// 01 — one letter per party
export function startForm(c: Case, p: Party, office: OfficeInfo, ref: string, replyDays: number): Filled {
  const contact =
    office.email || office.address
      ? `علماً بأن المراسلات تكون ${[office.email ? `على البريد الإلكتروني ${office.email}` : "", office.address ? `بالتسليم في مقر المكتب الكائن في ${office.address}` : ""].filter(Boolean).join(" أو ")}.`
      : "";
  return { kind: "start", vars: { ...common(c, office, ref), ...toParty(p, false), DAYS: qDaysTxt(replyDays), CONTACT_LINE: contact }, lists: {} };
}

// 02 — the expert's questions to one party
export function questionsForm(c: Case, l: QLetter, office: OfficeInfo, ref: string): Filled {
  const p = c.parties.find((x) => x.id === l.party_id);
  const to = p ? toParty(p, l.send_to === "lawyer") : { TO_LINE: `السادة / ${l.addressee ?? D} المحترمين`, TO_SUB: "" };
  return {
    kind: "questions",
    vars: { ...common(c, office, ref, l.letter_date), ...to, DAYS: qDaysTxt(l.days), DUE: l.due ? `${dayName(l.due)} ${fmtD(l.due)}` : D },
    lists: { Q: l.questions.length ? l.questions : [D] },
  };
}

// 03 / 04 — minutes of a meeting or an inspection
export function minutesForm(c: Case, e: Ev | undefined, office: OfficeInfo, ref: string, parties?: Party[], kindOf?: "meeting" | "inspection"): Filled {
  const kind = kindOf ?? (e?.type === "معاينة" ? "inspection" : "meeting");
  const meetings = c.events.filter((x) => x.type === "اجتماع").sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")));
  const n = e ? meetings.findIndex((x) => x.id === e.id) + 1 : 0;
  const ps = parties?.length ? parties : e ? invitedOf(c, e) : c.parties;
  const sides = [...new Set(ps.map((p) => normRole(p.role)))];
  return {
    kind,
    vars: {
      ...common(c, office, ref, e?.date),
      MEET_NO: n > 0 ? String(n) : D,
      DAY: e?.date ? dayName(e.date) : D,
      EV_DATE: e?.date ? fmtD(e.date) : D,
      TIME: or(arTime(e?.time)),
      PLACE: where(e, office),
      TOPIC: D,
      NOTIFIED: e?.created_at ? fmtD(e.created_at) : D,
      SIDE1: sides[0] ?? sideLabel(c, 1),
      SIDE2: sides[1] ?? (sides.length === 1 ? D : sideLabel(c, 2)),
    },
    lists: {},
  };
}

// 05 / 06 / 07 — letters to the court
export type CourtOpts = { date: string; hearing: string; period: string; reason: string; reasonDep: string; reasons: string[]; amount: string; payer: string };
export function courtForm(kind: "postpone" | "deposit" | "both", c: Case, office: OfficeInfo, ref: string, o: CourtOpts, letters: QLetter[], procRows: ProcRow[]): Filled {
  const cur = currencyOf(office.country)[0];
  const nd = o.amount ? Number(o.amount) : null;
  const diff = nd != null && c.deposit_ordered != null ? nd - Number(c.deposit_ordered) : null;
  const { vis } = procList(c, letters, procRows);
  return {
    kind,
    vars: {
      ...common(c, office, ref, o.date),
      HEARING: o.hearing ? `${dayName(o.hearing)} الموافق ${fmtD(o.hearing)}` : D,
      PERIOD: or(o.period),
      REASON: or(o.reason),
      REASON_DEP: or(o.reasonDep || o.reasons.join("، ")),
      REASON_EXTRA: o.reason ? `، ولـ ${o.reason}` : "",
      DEPOSIT: amount(c.deposit_ordered, cur),
      NEW_DEPOSIT: amount(nd, cur),
      DIFF: diff != null && diff > 0 ? amount(diff, cur) : D,
      PAYER: or(o.payer),
    },
    lists: { PROC: vis.length ? vis.map(procLine) : [D], REASONS: o.reasons.length ? o.reasons : [D] },
  };
}

// 08 / 09 — receipt or handover of documents
export function documentsForm(kind: "receipt" | "handover", c: Case, office: OfficeInfo, date = todayStr()): Filled {
  return { kind, vars: { ...common(c, office, "", date), DAY: dayName(date), EV_DATE: fmtD(date) }, lists: {} };
}

// 10 — the expert report skeleton
export function reportForm(c: Case & { proc_num?: string }, office: OfficeInfo, ref: string, letters: QLetter[], procRows: ProcRow[]): Filled {
  const cur = currencyOf(office.country)[0];
  const { vis } = procList(c, letters, procRows);
  const at = procAttsBySide(vis);
  return {
    kind: "report",
    vars: {
      ...common(c, office, ref),
      CIRCUIT: c.circuit ? ` — ${c.circuit}` : "",
      CASE_INFO: [`الرقم ${caseRef(c)}`, c.authority, c.circuit, c.judge ? `القاضي: ${c.judge}` : "", c.claim_value != null ? `قيمة المطالبة ${amount(c.claim_value, cur)}` : ""].filter(Boolean).join("، "),
      PARTIES_REP: c.parties
        .filter((p) => p.side !== 3 || p.name)
        .map((p) => `${normRole(p.role)}: ${p.name}${p.lawyer ? ` (وكيله: ${p.lawyer})` : ""}`)
        .join("؛ ") || D,
    },
    lists: {
      MISSION: (c.mission ?? "").split(/\n+/).map((x) => x.trim()).filter(Boolean).length ? (c.mission ?? "").split(/\n+/).map((x) => x.trim()).filter(Boolean) : [D, D],
      PROC: vis.length ? vis.map(procLine) : [D],
      ATT: [...at.s1, ...at.s2].length ? [...at.s1, ...at.s2] : [D],
    },
  };
}

// the brass accent of the forms follows the office's country identity
export const accentSwap = (country?: string) => ({ "8F6D36": themeOf(country).accent.slice(1).toUpperCase() });
