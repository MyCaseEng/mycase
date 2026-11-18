"use client";
import { useState, useTransition } from "react";
import type { Case, QLetter } from "@/lib/cases";
import type { OfficeInfo } from "@/lib/docs";
import { bundleAuto, sortItems, showDate, EXPERT, GRP_LABEL, type BundleItem, type CaseFinal, type Grp } from "@/lib/bundle";
import { bundleDocx } from "@/lib/bundle-doc";
import { saveBlob, safeName } from "@/lib/docx";
import { caseRef, normRole } from "@/lib/format";
import { Field, Modal, inputCls } from "@/components/ui";
import Confirm2 from "@/components/confirm2";
import { createClient } from "@/lib/supabase/client";
import { addAutoItems, saveItem, deleteItem, moveItem, saveFinal, finalUrl } from "./bundle-actions";

const panel = "rounded-2xl border border-line bg-white p-5";
const btn = "rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-background disabled:opacity-50";
type Bundle = { items: BundleItem[]; final: CaseFinal | null } | null;
type P = { c: Case; letters: QLetter[]; office: OfficeInfo; officeId: string; bundle: Bundle; canWrite: boolean };

// «2026.05.09», «2026/5/9» → 2026-05-09; anything else («تواريخ مختلفة», «-») stays as typed
const toIso = (s: string) => {
  const m = s.trim().match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  return m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : s.trim();
};

export default function BundlePanel({ c, letters, office, officeId, bundle, canWrite }: P) {
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState<BundleItem | "new" | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  if (!bundle)
    return (
      <section id="bundle" className={`${panel} scroll-mt-4`}>
        <h2 className="font-semibold">حافظة المستندات</h2>
        <p className="mt-2 text-sm text-muted">تحتاج هذه الميزة تحديث قاعدة البيانات (ملف 0021).</p>
      </section>
    );
  const rows = sortItems(c, bundle.items);
  const auto = bundleAuto(c, letters);
  const missing = auto.filter((a) => !bundle.items.some((i) => i.auto_key === a.auto_key));
  const link = bundle.final?.bundle_link ?? "";

  // siblings: same group (and same party for the parties' groups), in the order shown
  const siblings = (r: BundleItem) => rows.filter((x) => x.grp === r.grp && (r.grp === "party" || r.grp === "reply" ? x.party_id === r.party_id : true));
  const move = (r: BundleItem, d: -1 | 1) => {
    const s = siblings(r).map((x) => x.id);
    const i = s.indexOf(r.id);
    if (i + d < 0 || i + d >= s.length) return;
    [s[i], s[i + d]] = [s[i + d], s[i]];
    start(() => moveItem(c.id, s));
  };

  async function download() {
    setBusy(true);
    setMsg("");
    try {
      const blob = await bundleDocx(c, office, bundle!.items, link);
      saveBlob(`حافظة المستندات - ${safeName(caseRef(c) || "دعوى")}.docx`, blob);
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <section id="bundle" className={`${panel} scroll-mt-4 space-y-4`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h2 className="font-semibold">حافظة المستندات</h2>
          <p className="text-sm text-muted">فهرس ما يُسلَّم للمحكمة مع التقرير، ورابط الحافظة الكاملة. الترتيب: المحكمة، ثم مذكرات الرد، ثم محاضر الخبير، ثم مستندات كل طرف.</p>
        </div>
        <button onClick={download} disabled={busy} className="rounded-lg bg-ink px-4 py-1.5 text-sm font-semibold text-white hover:bg-ink-hover disabled:opacity-60">
          {busy ? "جارٍ الإعداد…" : "⬇ الحافظة المختصرة (Word)"}
        </button>
      </div>

      {canWrite && missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-brand-soft/60 px-3 py-2 text-sm">
          <span className="flex-1">
            {missing.length === 1 ? "بند واحد معروف" : `${missing.length} بنود معروفة`} من بيانات الدعوى لم يُضف بعد: {missing.map((m) => m.title).join("، ")}
          </span>
          <button
            disabled={pending}
            onClick={() => start(async () => setMsg((await addAutoItems(c.id, missing)).text))}
            className="rounded-lg bg-ink px-3 py-1 text-sm font-semibold text-white hover:bg-ink-hover disabled:opacity-60"
          >
            أضِفها للفهرس
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-background text-muted">
            <tr>
              <th className="w-12 px-2 py-2 text-center font-semibold">الرقم</th>
              <th className="px-2 py-2 text-right font-semibold">المستند</th>
              <th className="w-32 px-2 py-2 text-center font-semibold">تاريخ المستند</th>
              <th className="w-44 px-2 py-2 text-center font-semibold">تم تزويدنا بها من قبل</th>
              {canWrite && <th className="w-36" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => {
              const head = i === 0 || rows[i - 1].grp !== r.grp;
              return [
                head && (
                  <tr key={`h-${r.grp}`} className="bg-background/50">
                    <td colSpan={canWrite ? 5 : 4} className="px-3 py-1 text-xs font-semibold text-brand">
                      {GRP_LABEL[r.grp]}
                    </td>
                  </tr>
                ),
                <tr key={r.id}>
                  <td className="px-2 py-1.5 text-center font-semibold">{i + 1}</td>
                  <td className="px-2 py-1.5">{r.title}</td>
                  <td className="px-2 py-1.5 text-center">{showDate(r.doc_date)}</td>
                  <td className="px-2 py-1.5 text-center">{r.provider}</td>
                  {canWrite && (
                    <td className="px-2 py-1.5">
                      <div className="flex items-center justify-end gap-1">
                        <button title="أعلى" disabled={pending} onClick={() => move(r, -1)} className="rounded px-1.5 text-muted hover:bg-background">▲</button>
                        <button title="أسفل" disabled={pending} onClick={() => move(r, 1)} className="rounded px-1.5 text-muted hover:bg-background">▼</button>
                        <button onClick={() => setEdit(r)} className="rounded px-1.5 text-muted hover:bg-background">✎</button>
                      </div>
                    </td>
                  )}
                </tr>,
              ];
            })}
            {!rows.length && (
              <tr>
                <td colSpan={canWrite ? 5 : 4} className="px-3 py-4 text-center text-muted">
                  الفهرس فارغ. أضف البنود المعروفة من بيانات الدعوى، ثم مستندات الأطراف.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {canWrite && (
        <button onClick={() => setEdit("new")} className={btn}>
          + إضافة مستند
        </button>
      )}

      <LinkField c={c} link={link} canWrite={canWrite} />
      <FinalFiles c={c} officeId={officeId} final={bundle.final} canWrite={canWrite} />
      {msg && <p className="text-sm text-muted">{msg}</p>}
      {edit && <ItemModal c={c} item={edit === "new" ? null : edit} count={rows.length} onClose={() => setEdit(null)} />}
    </section>
  );
}

function LinkField({ c, link, canWrite }: { c: Case; link: string; canWrite: boolean }) {
  const [v, setV] = useState(link);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="rounded-xl bg-background/60 p-3">
      <div className="mb-1 text-sm font-semibold">رابط الحافظة الكاملة</div>
      <p className="mb-2 text-xs text-muted">رابط دائم لكل المستندات (WeTransfer أو OneDrive أو Google Drive…). يظهر في الصفحة الثانية من الحافظة مع رمز QR.</p>
      <div className="flex flex-wrap items-center gap-2">
        <input value={v} onChange={(e) => setV(e.target.value)} disabled={!canWrite} dir="ltr" placeholder="https://we.tl/…" className={inputCls + " flex-1"} />
        {canWrite && (
          <button
            disabled={pending || v.trim() === link}
            onClick={() => start(async () => setMsg((await saveFinal(c.id, { bundle_link: v.trim() || null })).text))}
            className={btn}
          >
            حفظ الرابط
          </button>
        )}
        {link && (
          <a href={link} target="_blank" rel="noreferrer" className="text-sm text-brand underline underline-offset-4">
            فتح
          </a>
        )}
        {msg && <span className="text-sm text-muted">{msg}</span>}
      </div>
    </div>
  );
}

const SLOTS = [
  { k: "report_path", label: "التقرير الموقّع", hint: "PDF", accept: "application/pdf" },
  { k: "bundle_path", label: "الحافظة المختصرة", hint: "PDF", accept: "application/pdf" },
  { k: "word_path", label: "التقرير بصيغة Word", hint: "DOCX", accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
] as const;

function FinalFiles({ c, officeId, final, canWrite }: { c: Case; officeId: string; final: CaseFinal | null; canWrite: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  async function upload(k: (typeof SLOTS)[number]["k"], file: File) {
    if (file.size > 100 * 1024 * 1024) return setErr("حجم الملف أكبر من 100 ميغابايت.");
    setBusy(k);
    setErr("");
    const ext = (file.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "");
    const key = `${officeId}/${c.id}/final/${k.replace("_path", "")}-${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from("case-files").upload(key, file, { contentType: file.type || undefined });
    if (error) {
      setBusy(null);
      return setErr("تعذّر رفع الملف: " + error.message);
    }
    const r = await saveFinal(c.id, { [k]: key });
    setBusy(null);
    if (!r.ok) setErr(r.text);
  }
  async function open(path: string) {
    const u = await finalUrl(path);
    if (u) window.open(u, "_blank");
  }
  return (
    <div>
      <div className="mb-2 text-sm font-semibold">الملف النهائي المودَع للمحكمة</div>
      <div className="grid gap-2 sm:grid-cols-3">
        {SLOTS.map((s) => {
          const path = final?.[s.k] ?? null;
          return (
            <div key={s.k} className={`rounded-xl border p-3 ${path ? "border-green-200 bg-green-50/50" : "border-line"}`}>
              <div className="text-sm font-semibold">
                {path ? "✓ " : ""}
                {s.label} <span className="text-xs font-normal text-muted">({s.hint})</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                {path && (
                  <button onClick={() => open(path)} className="text-brand underline underline-offset-4">
                    فتح
                  </button>
                )}
                {canWrite && (
                  <label className="cursor-pointer text-muted hover:text-ink">
                    {busy === s.k ? "جارٍ الرفع…" : path ? "استبدال" : "رفع الملف"}
                    <input type="file" accept={s.accept} className="hidden" disabled={!!busy} onChange={(e) => e.target.files?.[0] && upload(s.k, e.target.files[0])} />
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
    </div>
  );
}

function ItemModal({ c, item, count, onClose }: { c: Case; item: BundleItem | null; count: number; onClose: () => void }) {
  const parties = c.parties.filter((p) => p.side !== 3).sort((a, b) => a.side - b.side || a.sort - b.sort);
  // where the document belongs: court, the expert's minutes, or one party (its reply memos or its documents)
  const initial = item ? (item.grp === "party" || item.grp === "reply" ? `${item.grp}:${item.party_id ?? ""}` : item.grp) : parties[0] ? `party:${parties[0].id}` : "court";
  const [where, setWhere] = useState(initial);
  const providerFor = (w: string) => {
    const [g, pid] = w.split(":");
    if (g === "court") return c.authority || "المحكمة";
    if (g === "minutes") return EXPERT;
    return normRole(c.parties.find((p) => p.id === pid)?.role ?? "");
  };
  const [provider, setProvider] = useState(item?.provider ?? providerFor(initial));
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const [g, pid] = where.split(":");
    start(async () => {
      const r = await saveItem(c.id, item?.id ?? null, {
        grp: g as Grp,
        party_id: pid || null,
        provider,
        title: String(f.get("title") || ""),
        doc_date: toIso(String(f.get("doc_date") || "")),
        sort: item?.sort ?? count + 1,
        auto_key: item?.auto_key ?? null,
      });
      if (!r.ok) return setErr(r.text);
      onClose();
    });
  }

  return (
    <Modal title={item ? "تعديل بند في الحافظة" : "إضافة مستند إلى الحافظة"} onClose={onClose} width="max-w-xl">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field label="المستند" wide>
          <input name="title" required defaultValue={item?.title ?? ""} placeholder="مثل: نسخة من عقد المقاولة" className={inputCls} />
        </Field>
        <Field label="المجموعة">
          <select
            value={where}
            onChange={(e) => {
              setWhere(e.target.value);
              setProvider(providerFor(e.target.value));
            }}
            className={inputCls}
          >
            <option value="court">مستندات المحكمة</option>
            {parties.map((p) => (
              <option key={`r${p.id}`} value={`reply:${p.id}`}>
                مذكرة رد: {normRole(p.role)} — {p.name}
              </option>
            ))}
            <option value="minutes">محاضر الخبير</option>
            {parties.map((p) => (
              <option key={`p${p.id}`} value={`party:${p.id}`}>
                مستندات: {normRole(p.role)} — {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="تاريخ المستند">
          <input name="doc_date" defaultValue={item ? showDate(item.doc_date) : ""} placeholder="2026.05.09 أو تواريخ مختلفة" className={inputCls} />
        </Field>
        <Field label="تم تزويدنا بها من قبل" wide>
          <input value={provider} onChange={(e) => setProvider(e.target.value)} className={inputCls} />
        </Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button disabled={pending} className="rounded-lg bg-ink px-6 py-2 font-semibold text-white hover:bg-ink-hover disabled:opacity-60">
            حفظ
          </button>
          {err && <span className="text-sm text-red-700">{err}</span>}
          <span className="flex-1" />
          {item && <Confirm2 label="حذف البند" confirmLabel="تأكيد الحذف" onConfirm={() => start(async () => { await deleteItem(c.id, item.id); onClose(); })} />}
        </div>
      </form>
    </Modal>
  );
}
