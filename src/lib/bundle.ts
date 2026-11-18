// حافظة المستندات: the index of the documents handed to the court with the report.
// Order used by the office: court papers, then the parties' replies, then the expert's minutes,
// then each party's documents grouped by party. Numbers follow that order.
import type { Case, QLetter } from "@/lib/cases";
import { procAuto } from "@/lib/docs";
import { normRole } from "@/lib/format";

export type Grp = "court" | "reply" | "minutes" | "party";
export type BundleItem = {
  id: string;
  case_id: string;
  grp: Grp;
  party_id: string | null;
  provider: string;
  title: string;
  doc_date: string;
  sort: number;
  auto_key: string | null;
};
export type CaseFinal = { bundle_link: string | null; report_path: string | null; bundle_path: string | null; word_path: string | null };

export const GRP_LABEL: Record<Grp, string> = {
  court: "مستندات المحكمة",
  reply: "مذكرات رد الأطراف",
  minutes: "محاضر الخبير",
  party: "مستندات الأطراف",
};
const GRP_ORDER: Grp[] = ["court", "reply", "minutes", "party"];
export const EXPERT = "الخبير";

// the party's place: first side before second, then the order the parties were entered
const partyRank = (c: Case, id: string | null) => {
  const p = c.parties.find((x) => x.id === id);
  return p ? p.side * 1000 + p.sort : 9999;
};

export function sortItems(c: Case, items: BundleItem[]) {
  return items
    .slice()
    .sort(
      (a, b) =>
        GRP_ORDER.indexOf(a.grp) - GRP_ORDER.indexOf(b.grp) ||
        (a.grp === "party" || a.grp === "reply" ? partyRank(c, a.party_id) - partyRank(c, b.party_id) : 0) ||
        a.sort - b.sort ||
        a.doc_date.localeCompare(b.doc_date)
    );
}

// auto_key → document number, for «مستند رقم N» in the procedures
export const bundleNumbers = (c: Case, items: BundleItem[]) =>
  new Map(sortItems(c, items).flatMap((x, i) => (x.auto_key ? [[x.auto_key, i + 1] as [string, number]] : [])));

const iso = (d?: string | null) => (d ? d.slice(0, 10) : "");
export const showDate = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? d.replace(/-/g, ".") : d || "-");

// the rows the platform already knows: the judgment, each reply memo, each set of minutes
export function bundleAuto(c: Case, letters: QLetter[]): Omit<BundleItem, "id" | "case_id">[] {
  const role = (pid?: string | null) => normRole(c.parties.find((p) => p.id === pid)?.role ?? "");
  const out: Omit<BundleItem, "id" | "case_id">[] = [];
  procAuto(c, letters).forEach((x, i) => {
    if (!x.att) return;
    const [kind, , pid] = x.key.split("|");
    if (x.key === "assign")
      out.push({ grp: "court", party_id: null, provider: c.authority || "المحكمة", title: "الحكم التمهيدي", doc_date: iso(c.prelim_date || x.date), sort: 0, auto_key: x.key });
    else if (kind === "reply") {
      const l = letters.find((q) => q.id === x.key.split("|")[1]);
      const r = role(l?.party_id);
      out.push({ grp: "reply", party_id: l?.party_id ?? null, provider: r, title: `مذكرة رد ${r} على أسئلة واستفسارات الخبير`, doc_date: iso(x.date), sort: i, auto_key: x.key });
    } else if (kind === "meet")
      out.push({ grp: "minutes", party_id: pid ?? null, provider: EXPERT, title: x.att, doc_date: iso(x.date), sort: i, auto_key: x.key });
    else if (kind === "insp")
      out.push({ grp: "minutes", party_id: null, provider: EXPERT, title: "محضر المعاينة", doc_date: iso(x.date), sort: i, auto_key: x.key });
  });
  return out;
}
