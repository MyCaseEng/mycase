// Documents, letters and mission procedures, ported from the prototype. Pure functions (no I/O).
import type { Case, Ev, Party, QLetter } from "@/lib/cases";
import type { Ref } from "@/lib/refs";
import { caseRef, fmtD, isOrg, normCaseNo, normRole, roleSide, todayStr } from "@/lib/format";
import { signLine } from "@/lib/specialties";

export const AR_DAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
export const dayName = (d: string) => AR_DAYS[new Date(d + "T00:00:00Z").getUTCDay()];
export const OFFICE_PLACE = "مقر مكتب الخبير";
const Q_DAYS: Record<number, string> = { 1: "يوم واحد", 2: "يومين", 3: "ثلاثة أيام", 4: "أربعة أيام", 5: "خمسة أيام", 6: "ستة أيام", 7: "سبعة أيام", 8: "ثمانية أيام", 9: "تسعة أيام", 10: "عشرة أيام", 14: "أربعة عشر يوماً", 15: "خمسة عشر يوماً" };
export const qDaysTxt = (n: number) => Q_DAYS[n] || `${n} يوماً`;

export function arTime(t?: string | null) {
  if (!t || !/^\d{1,2}:\d{2}/.test(t)) return "";
  const [h, m] = t.split(":").map(Number);
  const per = h < 12 ? "صباحاً" : h < 14 ? "ظهراً" : h < 17 ? "عصراً" : "مساءً";
  return `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${per}`;
}
const lilRole = (r: string) => {
  r = normRole(r);
  return r.startsWith("ال") ? "لل" + r.slice(2) : "لـ" + r;
};
const joinAr = (a: string[]) => (a.length <= 1 ? a[0] ?? "" : a.slice(0, -1).join("، ") + " و" + a.at(-1));
const isFem = (r: string) => /ة$|ة\s/.test(normRole(r)) || /^(المدعية|المستأنفة|الطاعنة|المحتكمة)/.test(normRole(r));

export const sideOfCase = (c: Case, s: 1 | 2 | 3) => c.parties.filter((p) => p.side === s).sort((a, b) => a.sort - b.sort);
export const sideLabel = (c: Case, s: 1 | 2) => {
  const p = sideOfCase(c, s)[0];
  return p ? normRole(p.role) : s === 1 ? "الطرف الأول" : "الطرف الثاني";
};
export function sideLine(c: Case, s: 1 | 2) {
  const g = new Map<string, string[]>();
  sideOfCase(c, s).forEach((p) => g.set(normRole(p.role), [...(g.get(normRole(p.role)) ?? []), p.name]));
  return [...g.entries()].map(([r, ns]) => `${r} : ${ns.join(" ، ")}`).join(" / ");
}
export const invitedOf = (c: Case, e: Ev) =>
  e.invited === "1" || e.invited === "2" ? c.parties.filter((p) => String(p.side) === e.invited) : c.parties;

// Addressing: «السادة / ... المحترمين» for companies, law offices and authorities.
type Addr = { title: string; name: string; honor: string; agent: string };
// The name wins over the saved type: a party called "... للتجارة والمقاولات" is a company even if saved as a person.
function kindOf(p: { name: string; kind?: string | null }) {
  if (isOrg(p.name) || p.kind === "شركة" || p.kind === "جهة حكومية") return "شركة";
  return p.kind === "امرأة" ? "امرأة" : "رجل";
}
const T: Record<string, [string, string, string]> = { شركة: ["السادة", "المحترمين", "وكلاء"], امرأة: ["السيدة", "المحترمة", "وكيلة"], رجل: ["السيد", "المحترم", "وكيل"] };
export function partyAddr(p: Party, toLawyer: boolean): Addr {
  if (toLawyer && p.lawyer) {
    const t = T[kindOf({ name: p.lawyer })];
    return { title: t[0], name: p.lawyer, honor: t[1], agent: `${t[2]} ${normRole(p.role)} ${p.name}` };
  }
  const t = T[kindOf(p)];
  return { title: t[0], name: p.name, honor: t[1], agent: "" };
}
export function courtAddr(c: Case): Addr {
  return {
    title: "السادة",
    name: c.authority || "المحكمة",
    honor: "المحترمين",
    agent: [c.circuit ? `عناية: ${c.circuit}` : "", c.judge ? `القاضي: ${c.judge}` : ""].filter(Boolean).join(" — "),
  };
}

/* ---------------- mission procedures ---------------- */
export type ProcRow = { id: string; auto_key: string | null; date: string | null; body: string | null; hidden: boolean; att: string | null };
export type ProcLine = { key: string; id?: string; date: string; ord: number; text: string; att?: string; grp?: string; side?: number; auto: boolean; edited?: boolean; man?: boolean; n?: number };

export function procAuto(c: Case, letters: QLetter[]): ProcLine[] {
  const t = todayStr();
  const L: ProcLine[] = [];
  const party = (id: string | null) => c.parties.find((p) => p.id === id);
  const role = (p?: Party) => (p ? normRole(p.role) : "");
  const assign = c.prelim_date || c.received;
  if (assign)
    L.push({ key: "assign", date: assign, ord: 0, auto: true, grp: "0", att: "الحكم",
      text: "تم تكليفنا بالمأمورية من المحكمة الموقرة، وتم الاطلاع على الحكم التمهيدي وملف وأوراق الدعوى وما قدم فيها من مستندات" });
  const sentBy = new Map<string, Party[]>();
  letters.forEach((l) => {
    const d = (l.sent_at ?? "").slice(0, 10) || l.letter_date;
    const p = party(l.party_id);
    if (d && p) sentBy.set(d, [...(sentBy.get(d) ?? []), p]);
  });
  sentBy.forEach((ps, d) =>
    L.push({ key: `qsent|${d}`, date: d, ord: 1, auto: true,
      text: `قام الخبير بالتواصل مع ${joinAr([...new Set(ps.map(role))])} وتم إرسال الاستفسارات الخاصة بموضوع النزاع وتم طلب المستندات المؤيدة` })
  );
  // the day an appointment was set (its creation date) → "تم تحديد موعد …"
  const schBy = new Map<string, Ev[]>();
  c.events.filter((e) => e.type !== "جلسة").forEach((e) => {
    const d = ((e as Ev & { created_at?: string }).created_at ?? "").slice(0, 10);
    if (d) schBy.set(d, [...(schBy.get(d) ?? []), e]);
  });
  schBy.forEach((es, d) => {
    const parts = es.map((e) => {
      if (e.type === "معاينة") return `تم تحديد موعد المعاينة في تاريخ ${fmtD(e.date)}`;
      const rs = [...new Set(invitedOf(c, e).map(role).filter(Boolean))];
      return `تم تحديد موعد الاجتماع${e.invited !== "all" && rs.length ? " مع " + joinAr(rs) : ""} في تاريخ ${fmtD(e.date)}`;
    });
    L.push({ key: `sched|${d}`, date: d, ord: 2, auto: true, text: "قام الخبير بالتواصل مع طرفي الدعوى، و" + parts.join(" و") });
  });
  letters.forEach((l) => {
    if (!l.reply_date) return;
    const p = party(l.party_id);
    const r = role(p);
    const part = l.reply_type === "partial";
    L.push({ key: `reply|${l.id}`, date: l.reply_date, ord: 3, auto: true,
      text: `${isFem(r) ? "قامت" : "قام"} ${r} بتزويدنا ${part ? "بمذكرة رد جزئي" : "بمذكرة الرد"} على استفسارات الخبير مرفقة بالمستندات`,
      att: `مذكرة رد ${r}`, grp: `${p ? roleSide(p.role) : 3}.1.${r}`, side: p ? roleSide(p.role) : 3 });
  });
  c.events
    .filter((e) => e.type !== "جلسة" && e.date <= t)
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((e) => {
      if (e.type === "معاينة") {
        L.push({ key: `insp|${e.id}`, date: e.date, ord: 5, auto: true, text: "قام الخبير بإجراء المعاينة بحضور الطرفين", att: "محضر المعاينة", grp: "8" });
        return;
      }
      if (e.invited === "1" || e.invited === "2")
        invitedOf(c, e).forEach((p) => {
          const r = role(p);
          L.push({ key: `meet|${e.id}|${p.id}`, date: e.date, ord: 4, auto: true, text: `قام الخبير بالاجتماع مع ${r}`, att: `محضر الاجتماع مع ${r}`, grp: `${p.side}.2.${r}`, side: p.side });
        });
      else L.push({ key: `meet|${e.id}`, date: e.date, ord: 4, auto: true, text: "قام الخبير بالاجتماع مع الأطراف", att: "محضر الاجتماع", grp: "7" });
    });
  return L;
}

export function procList(c: Case & { proc_num?: string }, letters: QLetter[], rows: ProcRow[]) {
  const over = new Map(rows.filter((r) => r.auto_key).map((r) => [r.auto_key!, r]));
  const auto = procAuto(c, letters).map((x) => {
    const o = over.get(x.key);
    return { ...x, text: o?.body ?? x.text, edited: o?.body != null, hidden: !!o?.hidden };
  });
  const man = rows
    .filter((r) => !r.auto_key)
    .map((r) => ({ key: `man|${r.id}`, id: r.id, date: r.date ?? "", ord: 6, text: r.body ?? "", att: r.att ?? "", grp: "9", auto: false, man: true, hidden: r.hidden }));
  const all = [...auto, ...man].sort((a, b) => a.date.localeCompare(b.date) || a.ord - b.ord);
  const vis = all.filter((x) => !x.hidden);
  const hid = all.filter((x) => x.hidden);
  const withAtt = vis.filter((x) => x.att);
  const order = (c.proc_num ?? "party") === "party"
    ? withAtt.slice().sort((a, b) => (a.grp ?? "9").localeCompare(b.grp ?? "9") || a.date.localeCompare(b.date))
    : withAtt;
  order.forEach((x, i) => ((x as ProcLine).n = i + 1));
  return { vis: vis as ProcLine[], hid: hid as ProcLine[] };
}
export const procLine = (x: ProcLine) => `في تاريخ ${fmtD(x.date)} ${x.text}${x.att ? `، مرفق ${x.att} - مستند رقم ${x.n}` : ""}.`;
export function procAttsBySide(vis: ProcLine[]) {
  const s1: string[] = [], s2: string[] = [];
  vis.filter((x) => x.att && x.side).forEach((x) => (x.side === 1 ? s1 : s2).push(`${x.att} - مستند رقم ${x.n}`));
  return { s1, s2 };
}

/* ---------------- letters to the court ---------------- */
export type LetterKey = "start" | "postpone" | "deposit" | "both";
// court letters: the wording lives in the standard forms (src/lib/forms.ts); here only the name and the register category
export const LETTERS: Record<LetterKey, { label: string; cat: string }> = {
  start: { label: "إخطار الأطراف ببدء المأمورية", cat: "إشعار بمباشرة المأمورية" },
  postpone: { label: "طلب تأجيل موعد إيداع تقرير الخبرة", cat: "طلب تأجيل" },
  deposit: { label: "طلب إعادة تقدير الأمانة", cat: "طلب زيادة أمانة" },
  both: { label: "طلب تأجيل الإيداع وإعادة تقدير الأمانة", cat: "طلب تأجيل وإعادة تقدير الأمانة" },
};

/* ---------------- the "مستندات ونماذج الخبير" list ---------------- */
export type DocItem = {
  key: string;
  kind: "letter" | "start" | "q" | "qsetup" | "meet" | "insp" | "receipt" | "handover" | "report";
  label: string;
  sub: string;
  letter?: LetterKey;
  qLetter?: QLetter;
  party?: Party;
  parties?: Party[];
  ev?: Ev;
  stub?: boolean;
  ref?: Ref;
  category?: string;
};

export function caseDocs(c: Case, letters: QLetter[], refs: Ref[]): DocItem[] {
  const L: DocItem[] = [];
  const live = refs.filter((r) => r.status !== "ملغى");
  const latest = (cat: string) => live.filter((r) => r.category === cat).sort((a, b) => b.issued_at.localeCompare(a.issued_at))[0];
  const lt = (k: LetterKey) => {
    const x = LETTERS[k];
    const r = latest(x.cat);
    L.push({ key: `letter-${k}`, kind: "letter", letter: k, label: x.label, sub: r ? `آخر كتاب ${fmtD(r.issued_at)}` : "كتاب للمحكمة", ref: r, category: x.cat });
  };
  const main = [...sideOfCase(c, 1), ...sideOfCase(c, 2)];
  // 01: one notice per party that the mission has started
  main.forEach((p) =>
    L.push({ key: `start-${p.id}`, kind: "start", party: p, label: `إخطار ${lilRole(p.role)} ببدء المأمورية`, sub: p.name, ref: live.find((r) => r.category === "إشعار بمباشرة المأمورية" && (r.title ?? "").includes(p.name)), category: "إشعار بمباشرة المأمورية" })
  );
  main.forEach((p) => {
    const qs = letters.filter((l) => l.party_id === p.id);
    if (qs.length)
      qs.forEach((l) => L.push({ key: `q-${l.id}`, kind: "q", qLetter: l, party: p, label: `أسئلة واستفسارات الخبير ${lilRole(p.role)}`, sub: `${fmtD(l.letter_date)} · ${p.name}`, ref: live.find((r) => r.id === l.ref_id), category: "أسئلة واستفسارات" }));
    else L.push({ key: `qs-${p.id}`, kind: "qsetup", party: p, label: `أسئلة واستفسارات الخبير ${lilRole(p.role)}`, sub: `لم تُجهَّز بعد · ${p.name}` });
  });
  const evs = c.events.filter((e) => e.type !== "جلسة").sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")));
  const metWith = new Set<string>();
  const refFor = (cat: string, evId: string | null, partyName?: string) =>
    live.find((r) => r.category === cat && (evId ? r.event_id === evId : !r.event_id) && (!partyName || (r.title ?? "").includes(partyName)));
  evs.filter((e) => e.type === "اجتماع").forEach((e) => {
    const inv = invitedOf(c, e);
    if (e.invited === "1" || e.invited === "2")
      inv.forEach((p) => {
        metWith.add(p.id);
        L.push({ key: `meet-${e.id}-${p.id}`, kind: "meet", ev: e, party: p, label: `محضر الاجتماع مع ${normRole(p.role)}`, sub: `${fmtD(e.date)} · ${p.name}`, ref: refFor("محضر اجتماع", e.id, p.name), category: "محضر اجتماع" });
      });
    else {
      inv.forEach((p) => metWith.add(p.id));
      L.push({ key: `meet-${e.id}`, kind: "meet", ev: e, parties: inv, label: "محضر الاجتماع مع الأطراف", sub: fmtD(e.date), ref: refFor("محضر اجتماع", e.id), category: "محضر اجتماع" });
    }
  });
  main.filter((p) => !metWith.has(p.id)).forEach((p) =>
    L.push({ key: `stub-m-${p.id}`, kind: "meet", party: p, stub: true, label: `محضر الاجتماع مع ${normRole(p.role)}`, sub: `لم يُحدَّد موعد · ${p.name}`, ref: refFor("محضر اجتماع", null, p.name), category: "محضر اجتماع" })
  );
  const insps = evs.filter((e) => e.type === "معاينة");
  insps.forEach((e) => L.push({ key: `insp-${e.id}`, kind: "insp", ev: e, label: "محضر المعاينة", sub: fmtD(e.date) + (e.place ? ` · ${e.place}` : ""), ref: refFor("محضر معاينة", e.id), category: "محضر معاينة" }));
  if (!insps.length) L.push({ key: "stub-i", kind: "insp", stub: true, label: "محضر المعاينة", sub: "لم يُحدَّد موعد", ref: refFor("محضر معاينة", null), category: "محضر معاينة" });
  L.push({ key: "receipt", kind: "receipt", label: "محضر استلام مستندات", sub: "من أحد الأطراف", category: "وصل استلام" });
  L.push({ key: "handover", kind: "handover", label: "محضر تسليم مستندات", sub: "إعادة الأصول أو تسليم مستندات", category: "وصل استلام" });
  const repCat = c.supplementary ? "تقرير تكميلي" : "تقرير محكمة";
  L.push({ key: "report", kind: "report", label: "تقرير الخبرة", sub: c.report_date ? `سُلّم ${fmtD(c.report_date)}` : "للمحكمة", ref: latest(repCat), category: repCat });
  lt("postpone");
  lt("deposit");
  lt("both");
  return L;
}

/* ---------------- template variables for each document ---------------- */
// the office as printed on documents (letterhead, signature, currency)
export type OfficeInfo = { expertName: string; address: string; name?: string; country?: string; specialty?: string; reg?: string; phone?: string; email?: string };

export function qLetterVars(c: Case, l: QLetter, ref: string, office: OfficeInfo) {
  const p = c.parties.find((x) => x.id === l.party_id);
  const a = p ? partyAddr(p, l.send_to === "lawyer") : { title: "السادة", name: l.addressee ?? "", honor: "المحترمين", agent: "" };
  return {
    vars: { DATE: fmtD(l.letter_date), REF: ref || "……………", TITLE: a.title, NAME: a.name, HONOR: a.honor, AGENT: a.agent, CASE_NO: caseRef(c), DAYS: qDaysTxt(l.days), EXPERT: office.expertName },
    lists: { Q: l.questions },
    addr: a,
  };
}

export function qMailBody(c: Case, l: QLetter, ref: string, office: OfficeInfo, addr: Addr) {
  return [
    `${addr.title} / ${addr.name}          ${addr.honor}`,
    addr.agent,
    "تحية طيبة وبعد،",
    "",
    `الموضوع: أسئلة واستفسارات الخبير في الدعوى ${caseRef(c)}`,
    "",
    `في إطار المأمورية المسندة إلينا${c.authority ? " من " + c.authority : ""} في الدعوى المذكورة أعلاه، نرجو منكم تزويدنا بالرد على الأسئلة والاستفسارات التالية خلال ${qDaysTxt(l.days)} من تاريخه${l.due ? ` (أي في موعد أقصاه ${dayName(l.due)} ${fmtD(l.due)})` : ""}، مع إرفاق المستندات اللازمة.`,
    "",
    ...l.questions.map((q, k) => `${k + 1}. ${q}`),
    "",
    `مرفق: خطاب الأسئلة والاستفسارات${ref ? " رقم " + ref : ""}.`,
    "",
    "وتفضلوا بقبول فائق التقدير والاحترام،",
    signLine(office.specialty, office.expertName),
  ]
    .filter((x) => x !== "" || true)
    .join("\n")
    .replace(/\n\n\n+/g, "\n\n");
}

export const TEMPLATE_KINDS: [string, string][] = [
  ["questions", "خطاب أسئلة واستفسارات الخبير"],
  ["letter", "كتاب إلى المحكمة (إشعار مباشرة، تأجيل، أمانة)"],
  ["meeting", "محضر اجتماع"],
  ["inspection", "محضر معاينة"],
  ["report", "تقرير الخبرة"],
];

/* ---------------- appointment emails (meetings and inspections) ---------------- */
// Neutral wording for every office. {المخاطب} becomes «السادة / ... المحترمين» lines for the invited parties.
export const EV_TPL: Record<"اجتماع" | "معاينة", { subject: string; body: string }> = {
  اجتماع: {
    subject: "موعد الإجتماع في الدعوى رقم {رقم_الدعوى} {نوع_الدعوى}",
    body: "{المخاطب}\nتحية طيبة وبعد،\n\nالموضوع: موعد الإجتماع في الدعوى رقم {رقم_الدعوى} {نوع_الدعوى}\n\nبناءً على الحكم الصادر بندبنا خبيراً في الدعوى {رقم_الدعوى} {نوع_الدعوى} المقامة بين :\n\n{أطراف_الدعوى}\n\nنود أن نعلمكم أنه تم تحديد موعد الإجتماع معكم يوم {اليوم} الموافق لـ {التاريخ} على الساعة {الساعة}، وسيكون الإجتماع في {المكان}، ونطلب منكم حضوركم أو من تفوضونه للحضور نيابة عنكم مع تزويدنا بكتاب التفويض.\n{رابط_الموقع}\n{ملاحظة}\n\nوتفضلوا بقبول فائق الاحترام والتقدير،\n{اسم_الخبير}",
  },
  معاينة: {
    subject: "موعد المعاينة في الدعوى رقم {رقم_الدعوى} {نوع_الدعوى}",
    body: "{المخاطب}\nتحية طيبة وبعد،\n\nالموضوع: موعد المعاينة في الدعوى رقم {رقم_الدعوى} {نوع_الدعوى}\n\nبناءً على الحكم الصادر بندبنا خبيراً في الدعوى {رقم_الدعوى} {نوع_الدعوى} المقامة بين :\n\n{أطراف_الدعوى}\n\nنود أن نعلمكم أنه تم تحديد موعد المعاينة يوم {اليوم} الموافق لـ {التاريخ} على الساعة {الساعة}، وستكون المعاينة في {المكان}، ونطلب منكم حضوركم أو من تفوضونه للحضور نيابة عنكم مع تزويدنا بكتاب التفويض، وتسهيل دخولنا إلى الموقع.\n{رابط_الموقع}\n{ملاحظة}\n\nوتفضلوا بقبول فائق الاحترام والتقدير،\n{اسم_الخبير}",
  },
};
export const fillTpl = (t: string, v: Record<string, string>) =>
  t.replace(/\{([^{}]+)\}/g, (m, k) => (v[k] != null ? v[k] : m)).replace(/\n{3,}/g, "\n\n").trim();
const isUrl = (s: string) => /^https?:\/\//i.test(s.trim());
export function evMailVars(c: Case, e: Ev, office: OfficeInfo, addressees: Party[], toLawyer: (p: Party) => boolean) {
  const place = (e.place ?? "").trim();
  const online = /zoom|teams|meet\.google|أونلاين|عن بعد|عن بُعد/i.test(place);
  const where = !place
    ? "—"
    : place === OFFICE_PLACE
      ? office.address ? `مقر مكتبنا الكائن في ${office.address}` : "مقر مكتبنا"
      : isUrl(place)
        ? online ? "عن بُعد عبر الرابط أدناه" : "الموقع المحدد في الرابط أدناه"
        : place;
  const greet = addressees.map((p) => {
    const a = partyAddr(p, toLawyer(p));
    return `${a.title} / ${a.name} ${a.honor}${a.agent ? `\n${a.agent}` : ""}`;
  });
  return {
    المخاطب: greet.join("\n") || "السادة / الأطراف المحترمين",
    رقم_الدعوى: normCaseNo(c.case_no) || "—",
    نوع_الدعوى: c.case_type ?? "",
    أطراف_الدعوى: [sideLine(c, 1), "ضد", sideLine(c, 2)].filter(Boolean).join("\n"),
    اليوم: e.date ? dayName(e.date) : "",
    التاريخ: fmtD(e.date),
    الساعة: e.time ? arTime(e.time) : "—",
    المكان: where,
    رابط_الموقع: isUrl(place) ? (online ? "رابط الاجتماع: " : "رابط الموقع على الخريطة: ") + place : "",
    ملاحظة: e.note ? `ملاحظة: ${e.note}` : "",
    اسم_الخبير: signLine(office.specialty, office.expertName),
  };
}
