"use client";
import { useState, useTransition } from "react";
import type { Case, Pay } from "@/lib/cases";

const paidOf = (c: Case, kind: Pay["kind"]) => (c.pays ?? []).filter((p) => p.kind === kind).reduce((s, p) => s + Number(p.amount), 0);
const sideOf = (c: Case, s: 1 | 2) => c.parties.filter((p) => p.side === s).sort((a, b) => a.sort - b.sort);
import { fmtD, money, todayStr } from "@/lib/format";
import { Field, inputCls } from "@/components/ui";
import Confirm2 from "@/components/confirm2";
import { createClient } from "@/lib/supabase/client";
import { addPayment, deletePayment, receiptUrl } from "./money-actions";

const panel = "rounded-2xl border border-line bg-white p-5";

// الأمانة (paid by the parties to the court) and the expert's fees (paid out by the court after the report).
export default function MoneyPanel({ c, officeId, canWrite }: { c: Case; officeId: string; canWrite: boolean }) {
  const [form, setForm] = useState<null | "deposit" | "fee">(null);
  if (!c.pays) {
    return (
      <section id="money" className={`${panel} scroll-mt-4`}>
        <h2 className="font-semibold">الأمانة والأتعاب</h2>
        <p className="mt-2 text-sm text-muted">تحتاج هذه الميزة تحديث قاعدة البيانات (ملف 0020).</p>
      </section>
    );
  }
  const due = Number(c.deposit_ordered ?? 0);
  const paid = paidOf(c, "deposit");
  const fees = paidOf(c, "fee");
  const deps = c.pays.filter((p) => p.kind === "deposit");
  const feeRows = c.pays.filter((p) => p.kind === "fee");
  const state =
    due <= 0 ? null : paid <= 0 ? ["لم تُسدَّد", "bg-red-50 text-red-700"] : paid < due ? ["سُدّدت جزئيًا", "bg-amber-50 text-amber-800"] : ["سُدّدت كاملة", "bg-green-50 text-green-800"];

  return (
    <section id="money" className={`${panel} scroll-mt-4 space-y-4`}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-semibold">الأمانة والأتعاب</h2>
        {state && <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${state[1]}`}>الأمانة: {state[0]}</span>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="الأمانة المقررة" value={due > 0 ? money(due) : "غير محددة"} />
        <Stat label="المسدَّد للمحكمة" value={money(paid)} />
        <Stat label="الباقي" value={due > 0 ? money(Math.max(due - paid, 0)) : "—"} warn={due > 0 && paid < due} />
        <Stat label="الأتعاب المصروفة للخبير" value={fees > 0 ? money(fees) : "—"} />
      </div>

      {due > 0 && paid <= 0 && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm leading-7 text-amber-900">
          لا يبدأ الخبير المأمورية قبل سداد الأمانة في خزينة المحكمة. سجّل السداد عند وصول الإيصال، ضمن أوراق التكليف أو من الطرف المسدِّد.
        </p>
      )}

      <PayList title="سداد الأمانة في خزينة المحكمة" rows={deps} c={c} canWrite={canWrite} empty="لم يُسجَّل أي سداد بعد." />
      <PayList title="صرف أتعاب الخبير من المحكمة" rows={feeRows} c={c} canWrite={canWrite} empty="لم تُصرف الأتعاب بعد." />

      {canWrite && !form && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setForm("deposit")} className="rounded-lg bg-ink px-4 py-1.5 text-sm font-semibold text-white hover:bg-ink-hover">
            + تسجيل سداد الأمانة
          </button>
          <button onClick={() => setForm("fee")} className="rounded-lg border border-line px-4 py-1.5 text-sm hover:bg-background">
            + تسجيل صرف الأتعاب
          </button>
        </div>
      )}
      {form && <PayForm kind={form} c={c} officeId={officeId} remaining={Math.max(due - paid, 0)} onClose={() => setForm(null)} />}
    </section>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-xl bg-background px-3 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-0.5 font-semibold ${warn ? "text-red-700" : "text-ink"}`}>{value}</div>
    </div>
  );
}

function PayList({ title, rows, c, canWrite, empty }: { title: string; rows: Pay[]; c: Case; canWrite: boolean; empty: string }) {
  const [, start] = useTransition();
  const who = (p: Pay) => c.parties.find((x) => x.id === p.party_id)?.name ?? p.payer_name ?? "—";
  return (
    <div>
      <h3 className="mb-1.5 text-sm font-semibold text-muted">{title}</h3>
      {!rows.length ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {rows.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm">
              <span className="font-semibold">{money(p.amount)}</span>
              <span>{fmtD(p.paid_on)}</span>
              {p.kind === "deposit" && <span>{who(p)}</span>}
              {p.receipt_no && <span className="text-muted">إيصال رقم <span dir="ltr">{p.receipt_no}</span></span>}
              {p.note && <span className="text-muted">{p.note}</span>}
              <span className="flex-1" />
              {p.file_path && <ReceiptLink path={p.file_path} />}
              {canWrite && <Confirm2 label="حذف" confirmLabel="تأكيد الحذف" onConfirm={() => start(() => deletePayment(c.id, p.id))} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReceiptLink({ path }: { path: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const u = await receiptUrl(path);
        setBusy(false);
        if (u) window.open(u, "_blank");
      }}
      className="text-sm text-brand underline underline-offset-4"
    >
      {busy ? "لحظة…" : "الإيصال"}
    </button>
  );
}

function PayForm({ kind, c, officeId, remaining, onClose }: { kind: "deposit" | "fee"; c: Case; officeId: string; remaining: number; onClose: () => void }) {
  const parties = [...sideOf(c, 1), ...sideOf(c, 2)];
  const [payer, setPayer] = useState(parties[0]?.id ?? "other");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const amount = Number(String(f.get("amount") || "").replace(/[^\d.]/g, ""));
    if (!(amount > 0)) return setErr("اكتب المبلغ.");
    setBusy(true);
    setErr("");
    let file_path: string | null = null;
    const file = f.get("file") as File | null;
    if (file && file.size) {
      if (file.size > 10 * 1024 * 1024) return (setBusy(false), setErr("حجم الإيصال أكبر من 10 ميغابايت."));
      const ext = (file.name.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "");
      const key = `${officeId}/${c.id}/receipts/${crypto.randomUUID()}.${ext}`;
      const { error } = await createClient().storage.from("case-files").upload(key, file, { contentType: file.type });
      if (error) return (setBusy(false), setErr("تعذّر رفع الإيصال: " + error.message));
      file_path = key;
    }
    const r = await addPayment(c.id, {
      kind,
      party_id: kind === "deposit" && payer !== "other" ? payer : null,
      payer_name: kind === "deposit" && payer === "other" ? String(f.get("payer_name") || "") : null,
      amount,
      paid_on: String(f.get("paid_on") || ""),
      receipt_no: String(f.get("receipt_no") || ""),
      file_path,
      note: String(f.get("note") || ""),
    });
    setBusy(false);
    if (!r.ok) return setErr(r.text);
    onClose();
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-line bg-background/60 p-4 sm:grid-cols-2">
      <h3 className="font-semibold sm:col-span-2">{kind === "deposit" ? "تسجيل سداد الأمانة" : "تسجيل صرف أتعاب الخبير"}</h3>
      {kind === "deposit" && (
        <Field label="الطرف المسدِّد">
          <select value={payer} onChange={(e) => setPayer(e.target.value)} className={inputCls}>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value="other">جهة أخرى…</option>
          </select>
        </Field>
      )}
      {kind === "deposit" && payer === "other" && (
        <Field label="اسم المسدِّد">
          <input name="payer_name" className={inputCls} />
        </Field>
      )}
      <Field label="المبلغ">
        <input name="amount" inputMode="decimal" dir="ltr" required defaultValue={kind === "deposit" && remaining > 0 ? remaining : ""} className={inputCls + " text-right"} />
      </Field>
      <Field label={kind === "deposit" ? "تاريخ السداد" : "تاريخ الصرف"}>
        <input type="date" name="paid_on" required defaultValue={todayStr()} className={inputCls} />
      </Field>
      <Field label="رقم الإيصال (اختياري)">
        <input name="receipt_no" dir="ltr" className={inputCls + " text-right"} />
      </Field>
      <Field label="صورة الإيصال أو PDF (اختياري)">
        <input type="file" name="file" accept="image/*,application/pdf" className="block w-full text-sm" />
      </Field>
      <Field label="ملاحظة" wide>
        <input name="note" className={inputCls} />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={busy} className="rounded-lg bg-ink px-6 py-2 font-semibold text-white hover:bg-ink-hover disabled:opacity-60">
          {busy ? "جارٍ الحفظ…" : "حفظ"}
        </button>
        <button type="button" onClick={onClose} className="text-sm text-muted">
          إلغاء
        </button>
        {err && <span className="text-sm text-red-700">{err}</span>}
      </div>
    </form>
  );
}
