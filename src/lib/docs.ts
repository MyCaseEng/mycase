// Documents, letters and mission procedures, ported from the prototype. Pure functions (no I/O).
import type { Case, Ev, Party, QLetter } from "@/lib/cases";
import type { Ref } from "@/lib/refs";
import { caseRef, fmtD, isOrg, normRole, roleSide, todayStr } from "@/lib/format";
import { DOTS } from "@/lib/docx";

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
function kindOf(p: { name: string; kind?: string | null }) {
  if (p.kind === "شركة" || p.kind === "جهة حكومية" || isOrg(p.name)) return "شركة";
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
export type LetterOpts = { date: string; hearing?: string; period?: string; amount?: string; payer?: string; reason?: string };
const money = (n: number | string) => Number(n).toLocaleString("en-US");
export const LETTERS: Record<LetterKey, { label: string; cat: string; subj: (c: Case) => string; body: (c: Case, o: LetterOpts) => string }> = {
  start: {
    label: "إشعار مباشرة المأمورية",
    cat: "إشعار بمباشرة المأمورية",
    subj: (c) => `إشعار بمباشرة المأمورية في الدعوى ${caseRef(c)}`,
    body: (c, o) =>
      `بنــاءً علــى الحكم التمهيدي الصــادر مــن عدالة المحكمة الموقرة${c.prelim_date ? " بتاريخ " + fmtD(c.prelim_date) : ""} بندبنــا خبيـــراً هندسيــاً فـي الدعوى المذكورة أعلاه، نحيط عدالتكم علماً بأننا قد باشرنا أعمال المأمورية اعتباراً من تاريخ ${fmtD(o.date)}.\n\nوسنقوم بإخطار أطراف الدعوى بمواعيد الاجتماعات والمعاينة، وموافاة عدالتكم بالتقرير فور الانتهاء من أعمال المأمورية.`,
  },
  postpone: {
    label: "كتاب طلب تأجيل",
    cat: "طلب تأجيل",
    subj: (c) => `طلب تأجيل نظر الدعوى ${caseRef(c)}`,
    body: (c, o) =>
      `بالإشارة إلى الدعوى المذكورة أعلاه، والمحدد لنظرها جلسة ${o.hearing ? dayName(o.hearing) + " الموافق " + fmtD(o.hearing) : "……………"}، نفيد عدالتكم بأن أعمال الخبرة لا تزال جارية، وذلك ${o.reason || "……………………………………"}.\n\nلذا نلتمس من عدالتكم التكرم بتأجيل نظر الدعوى لمدة ${o.period || "……………"} حتى يتسنى لنا استكمال أعمال المأمورية وإيداع التقرير.`,
  },
  deposit: {
    label: "كتاب طلب زيادة أمانة",
    cat: "طلب زيادة أمانة",
    subj: (c) => `طلب زيادة أمانة الخبير في الدعوى ${caseRef(c)}`,
    body: (c, o) =>
      `بالإشارة إلى الحكم التمهيدي الصادر في الدعوى المذكورة أعلاه${c.deposit_ordered ? "، والذي قدّر أمانة الخبير بمبلغ " + money(c.deposit_ordered) + " ريال قطري" : ""}، وبعد الاطلاع على ملف الدعوى وما تتطلبه المأمورية من أعمال ${o.reason || "……………………………………"}، تبيّن أن الأمانة المقدرة لا تتناسب مع حجم الأعمال المطلوبة.\n\nلذا نلتمس من عدالتكم التكرم بإعادة تقدير الأمانة لتصبح ${o.amount ? money(o.amount) + " ريال قطري" : "……………"}، وإلزام ${o.payer || "……………"} بسدادها، حتى يتسنى لنا مباشرة أعمال المأمورية وإنجازها على الوجه المطلوب.`,
  },
  both: {
    label: "كتاب طلب تأجيل وإعادة تقدير الأمانة",
    cat: "طلب تأجيل وإعادة تقدير الأمانة",
    subj: (c) => `طلب تأجيل نظر الدعوى وإعادة تقدير الأمانة في الدعوى ${caseRef(c)}`,
    body: (c, o) =>
      `بالإشارة إلى الدعوى المذكورة أعلاه، والمحدد لنظرها جلسة ${o.hearing ? dayName(o.hearing) + " الموافق " + fmtD(o.hearing) : "……………"}${c.deposit_ordered ? "، وإلى الحكم التمهيدي الذي قدّر أمانة الخبير بمبلغ " + money(c.deposit_ordered) + " ريال قطري" : ""}، وبعد الاطلاع على ملف الدعوى وما تتطلبه المأمورية من أعمال، تبيّن أن الأمانة المقدرة لا تتناسب مع حجم الأعمال المطلوبة، وأن المدة المتبقية لا تكفي لاستكمال أعمال المأمورية، وذلك ${o.reason || "……………………………………"}.\n\nلذا نلتمس من عدالتكم التكرم بتأجيل نظر الدعوى لمدة ${o.period || "……………"}، وإعادة تقدير الأمانة لتصبح ${o.amount ? money(o.amount) + " ريال قطري" : "……………"} وإلزام ${o.payer || "……………"} بسدادها.`,
  },
};

/* ---------------- the "مستندات ونماذج الخبير" list ---------------- */
export type DocItem = {
  key: string;
  kind: "letter" | "q" | "qsetup" | "meet" | "insp" | "report";
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
  lt("start");
  const main = [...sideOfCase(c, 1), ...sideOfCase(c, 2)];
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
  const repCat = c.supplementary ? "تقرير تكميلي" : "تقرير محكمة";
  L.push({ key: "report", kind: "report", label: "تقرير الخبرة", sub: c.report_date ? `سُلّم ${fmtD(c.report_date)}` : "للمحكمة", ref: latest(repCat), category: repCat });
  lt("postpone");
  lt("deposit");
  lt("both");
  return L;
}

/* ---------------- template variables for each document ---------------- */
export type OfficeInfo = { expertName: string; address: string };

export function docVars(c: Case & { proc_num?: string }, d: DocItem, ref: string, office: OfficeInfo, letters: QLetter[], procRows: ProcRow[]): { kind: string; vars: Record<string, string>; lists: Record<string, string[]> } {
  const R = ref || "……………";
  if (d.kind === "meet") {
    const e = d.ev;
    const ps = d.party ? [d.party] : d.parties?.length ? d.parties : e ? invitedOf(c, e) : c.parties;
    return {
      kind: "meeting",
      vars: { REF: R, CASE_NO: caseRef(c), DATE: e?.date ? fmtD(e.date) : "……………", DAY: e?.date ? dayName(e.date) : "……………",
        PARTY_LINE: ps.map((p) => `${normRole(p.role)} : ${p.name}`).join(" ، "), SIG_PARTY: ps.length === 1 ? normRole(ps[0].role) : "الأطراف" },
      lists: {},
    };
  }
  if (d.kind === "insp") {
    const e = d.ev;
    const atOffice = !e?.place || e.place === OFFICE_PLACE;
    return {
      kind: "inspection",
      vars: { REF: R, CASE_NO: caseRef(c), DATE: e?.date ? fmtD(e.date) : "……………", TIME: arTime(e?.time),
        PLACE: atOffice ? OFFICE_PLACE + (office.address ? " - " + office.address : "") : e!.place!,
        P1_LINE: sideLine(c, 1), P2_LINE: sideLine(c, 2), SIDE1: sideLabel(c, 1), SIDE2: sideLabel(c, 2), SIG_P1: sideLabel(c, 1), SIG_P2: sideLabel(c, 2) },
      lists: {},
    };
  }
  // report
  const t = todayStr();
  const { vis } = procList(c, letters, procRows);
  const proc = vis.map(procLine);
  proc.push(DOTS);
  const at = procAttsBySide(vis);
  const ses = c.events.filter((e) => e.type === "جلسة").map((e) => e.date).sort();
  const next = ses.find((x) => x >= t) || ses.at(-1) || c.deadline || "";
  return {
    kind: "report",
    vars: { REF: R, SUBJECT: DOTS.slice(0, 20), COURT: c.authority ?? "", CASE_NO: caseRef(c), P1_LINE: sideLine(c, 1), P2_LINE: sideLine(c, 2),
      SESSION_DATE: next ? fmtD(next) : "……………", ATT_SIDE1: `مستندات ${sideLabel(c, 1)}`, ATT_SIDE2: `مستندات ${sideLabel(c, 2)}` },
    lists: { MISSION: [DOTS, DOTS, DOTS], PROC: proc, ATT1: at.s1.length ? at.s1 : [DOTS, DOTS], ATT2: at.s2.length ? at.s2 : [DOTS, DOTS] },
  };
}

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
    `بنــاءً علــى الحكم التمهيدي الصــادر مــن عدالة المحكمة الموقرة بندبنــا خبيـــراً هندسيــاً في الدعوى المذكورة أعلاه، نطلب منكم تزويدنا بالرد على الأسئلة والاستفسارات التالية خلال ${qDaysTxt(l.days)} من تاريخه${l.due ? ` (أي في موعد أقصاه ${dayName(l.due)} ${fmtD(l.due)})` : ""}، مع إرفاق المستندات اللازمة.`,
    "",
    ...l.questions.map((q, k) => `${k + 1}. ${q}`),
    "",
    `مرفق: خطاب الأسئلة والاستفسارات${ref ? " رقم " + ref : ""}.`,
    "",
    "وتفضلوا بقبول فائق التقدير والاحترام،",
    `الخبير الهندسي/ ${office.expertName}`,
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
