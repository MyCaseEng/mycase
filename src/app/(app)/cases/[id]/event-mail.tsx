"use client";
// Email to the parties about a meeting or an inspection: pick recipients (party and/or lawyer),
// the text is filled from the office template, then download an Outlook draft or copy the text.
import { useMemo, useState } from "react";
import type { Case, Ev, Party } from "@/lib/cases";
import { EV_TPL, evMailVars, fillTpl, invitedOf, type OfficeInfo } from "@/lib/docs";
import { buildEml, safeName, saveBlob } from "@/lib/docx";
import { normRole } from "@/lib/format";
import { Modal, inputCls } from "@/components/ui";

type Rc = { key: string; email: string; label: string; party: Party; lawyer: boolean };

export default function EventMail({ c, e, office, onClose }: { c: Case; e: Ev; office: OfficeInfo; onClose: () => void }) {
  const invited = invitedOf(c, e);
  const rc: Rc[] = useMemo(
    () =>
      invited.flatMap((p) => [
        ...(p.email ? [{ key: p.id + "p", email: p.email, label: `${normRole(p.role)}: ${p.name}`, party: p, lawyer: false }] : []),
        ...(p.lawyer_email ? [{ key: p.id + "l", email: p.lawyer_email, label: `محامي ${normRole(p.role)}: ${p.lawyer ?? p.name}`, party: p, lawyer: true }] : []),
      ]),
    [invited]
  );
  const [sel, setSel] = useState<string[]>(rc.map((r) => r.key));
  const [extra, setExtra] = useState("");
  const [cc, setCc] = useState("");
  const [edited, setEdited] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState("");

  // the greeting follows the chosen recipients: a lawyer who is chosen alone is addressed as the party's agent
  const chosen = rc.filter((r) => sel.includes(r.key));
  const addressees = invited.filter((p) => !chosen.length || chosen.some((r) => r.party.id === p.id));
  const viaLawyer = (p: Party) => chosen.some((r) => r.party.id === p.id && r.lawyer) && !chosen.some((r) => r.party.id === p.id && !r.lawyer);
  const tpl = EV_TPL[e.type as "اجتماع" | "معاينة"] ?? EV_TPL["اجتماع"];
  const vars = evMailVars(c, e, office, addressees, viaLawyer);
  const auto = { subject: fillTpl(tpl.subject, vars), body: fillTpl(tpl.body, vars) };
  const [subject, setSubject] = useState(auto.subject);
  const [body, setBody] = useState(auto.body);
  const subj = edited ? subject : auto.subject;
  const text = edited ? body : auto.body;

  const toList = () => [...new Set([...chosen.map((r) => r.email), ...extra.split(/[,;،\s]+/).map((x) => x.trim()).filter(Boolean)])];
  function download() {
    const to = toList();
    if (!to.length) return setErr("اختر مرسلاً إليه واحداً على الأقل، أو اكتب بريداً إضافياً.");
    const eml = buildEml(to, cc.trim(), subj, text);
    saveBlob(safeName(`${e.type} ${c.case_no ?? ""} ${e.date}`) + ".eml", new Blob([eml], { type: "message/rfc822" }));
    onClose();
  }
  async function copy(t: string, ok: string) {
    try {
      await navigator.clipboard.writeText(t);
      setCopied(ok);
    } catch {
      setCopied("تعذّر النسخ، حدّد النص وانسخه يدوياً.");
    }
  }
  const mailto = `mailto:${toList().join(",")}?subject=${encodeURIComponent(subj)}${cc ? `&cc=${encodeURIComponent(cc)}` : ""}&body=${encodeURIComponent(text.replace(/\n/g, "\r\n"))}`;

  return (
    <Modal title={`إيميل ${e.type} · ${e.date.replace(/-/g, ".")}`} onClose={onClose} width="max-w-3xl">
      <div className="space-y-1 rounded-lg border border-line p-3 text-sm">
        <div className="mb-1 text-muted">المرسل إليهم</div>
        {rc.map((r) => (
          <label key={r.key} className="flex flex-wrap items-center gap-2">
            <input type="checkbox" checked={sel.includes(r.key)} onChange={(ev) => setSel(ev.target.checked ? [...sel, r.key] : sel.filter((k) => k !== r.key))} />
            {r.label} <span dir="ltr" className="text-muted">{r.email}</span>
          </label>
        ))}
        {!rc.length && <p className="text-amber-700">لا يوجد بريد مسجّل للأطراف المدعوّين ولا لمحاميهم. أضفه من بيانات الدعوى، أو اكتبه أدناه.</p>}
        <input dir="ltr" value={extra} onChange={(ev) => setExtra(ev.target.value)} placeholder="بريد إضافي (افصل بفاصلة)" className={inputCls} />
        <input dir="ltr" value={cc} onChange={(ev) => setCc(ev.target.value)} placeholder="نسخة (CC)" className={inputCls} />
      </div>
      <label className="mt-3 block text-sm">
        <span className="text-muted">الموضوع</span>
        <input value={subj} onChange={(ev) => { setSubject(ev.target.value); setBody(text); setEdited(true); }} className={inputCls} />
      </label>
      <label className="mt-3 block text-sm">
        <span className="text-muted">النص {edited ? "" : "(يتغيّر المخاطَب تلقائياً حسب من تختار أعلاه)"}</span>
        <textarea rows={14} value={text} onChange={(ev) => { setBody(ev.target.value); setSubject(subj); setEdited(true); }} className={inputCls + " leading-7"} />
      </label>
      {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
      {copied && <p className="mt-2 text-sm text-green-700">{copied}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={download} className="rounded-lg bg-ink px-5 py-2 font-semibold text-white hover:bg-ink-hover">
          تنزيل مسودة Outlook
        </button>
        <a href={mailto} className="rounded-lg border border-line px-4 py-2 hover:border-brand">
          فتح ببرنامج البريد
        </a>
        <button onClick={() => copy(toList().join("; "), "نُسخت الإيميلات")} className="rounded-lg border border-line px-4 py-2 hover:border-brand">
          نسخ الإيميلات
        </button>
        <button onClick={() => copy(subj + "\n\n" + text, "نُسخ الموضوع والنص")} className="rounded-lg border border-line px-4 py-2 hover:border-brand">
          نسخ النص
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">«تنزيل مسودة Outlook» ينزّل ملفاً تفتحه فيظهر في Outlook رسالةً جاهزة، وأنت من يضغط «إرسال». «فتح ببرنامج البريد» أسرع لكنه قد يقصّ النص العربي الطويل.</p>
    </Modal>
  );
}
