"use client";
import { useState, useTransition } from "react";
import Confirm2 from "@/components/confirm2";
import { Modal, inputCls } from "@/components/ui";
import { answerTicket, deleteOffice, setOfficeActive, saveSubscription, renewSubscription, cancelSubscription } from "./actions";
import { subState, subDates, SUB_LABEL, SUB_TONE, type Sub } from "@/lib/subscription";
import { fmtD, todayStr, dayDiff, days } from "@/lib/format";

// Suspend / re-activate (two clicks) and delete (type the office name to confirm).
export function OfficeActions({ id, name, active }: { id: string; name: string; active: boolean }) {
  const [pending, start] = useTransition();
  const [del, setDel] = useState(false);
  const [typed, setTyped] = useState("");
  const [err, setErr] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {active ? (
        <Confirm2 label="إيقاف" confirmLabel="تأكيد الإيقاف" onConfirm={() => start(async () => void (await setOfficeActive(id, false)))} />
      ) : (
        <button disabled={pending} onClick={() => start(async () => void (await setOfficeActive(id, true)))} className="rounded-lg border border-green-700 px-3 py-1 text-sm text-green-700">
          تفعيل
        </button>
      )}
      <button onClick={() => setDel(true)} className="rounded-lg px-2 py-1 text-sm text-muted hover:text-red-700">
        حذف
      </button>
      {del && (
        <Modal title="حذف المكتب نهائياً" onClose={() => setDel(false)} width="max-w-md">
          <p className="text-sm leading-7">
            سيُحذف <b>{name}</b> مع كل ما فيه: الدعاوى والمواعيد والأرقام المرجعية والقوالب وسجل النشاط، ويخرج منه كل أعضائه. لا يمكن التراجع عن الحذف. إن كنت تريد منعه مؤقتاً فقط، استعمل «إيقاف».
          </p>
          <label className="mt-3 block text-sm">
            <span className="text-muted">للتأكيد، اكتب اسم المكتب كما هو:</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} className={inputCls} />
          </label>
          {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
          <button
            disabled={typed.trim() !== name || pending}
            onClick={() =>
              start(async () => {
                const r = await deleteOffice(id, typed.trim());
                if (r.ok) setDel(false);
                else setErr(r.text);
              })
            }
            className="mt-4 rounded-lg bg-red-700 px-5 py-2 font-semibold text-white disabled:opacity-40"
          >
            حذف نهائي
          </button>
        </Modal>
      )}
    </div>
  );
}

export function TicketReply({ id, reply, status }: { id: string; reply: string | null; status: string }) {
  const [text, setText] = useState(reply ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const save = (st: "open" | "done") =>
    start(async () => {
      const r = await answerTicket(id, text, st);
      setMsg(r.text);
    });
  return (
    <div className="mt-2 space-y-2">
      <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="ردّك على المكتب (يظهر له في نافذة الدعم)" className={inputCls + " leading-7"} />
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={pending} onClick={() => save("done")} className="rounded-lg bg-ink px-4 py-1.5 text-sm font-semibold text-white hover:bg-ink-hover disabled:opacity-60">
          إرسال الرد وإغلاق
        </button>
        <button disabled={pending} onClick={() => save("open")} className="rounded-lg border border-line px-3 py-1.5 text-sm">
          {status === "done" ? "إعادة فتح" : "حفظ الرد وإبقاؤها مفتوحة"}
        </button>
        {msg && <span className="text-xs text-green-700">{msg}</span>}
      </div>
    </div>
  );
}

// The subscription of one office: status in the table, and a window to edit it, record a payment, or cancel it.
export function SubscriptionCell({ sub, office }: { sub: Sub | null; office: string }) {
  const [open, setOpen] = useState(false);
  if (!sub) return <span className="text-xs text-muted">—</span>;
  const st = subState(sub, todayStr());
  const d = subDates(sub);
  const line =
    st === "trial" ? `آخر يوم ${fmtD(d.end)} (${dayDiff(d.end) === 0 ? "اليوم" : `بعد ${days(dayDiff(d.end))}`})`
    : st === "active" ? `حتى ${fmtD(d.end)}`
    : st === "grace" ? `انتهى ${fmtD(d.end)} · كامل حتى ${fmtD(d.fullUntil)}`
    : st === "export" ? `انتهى ${fmtD(d.end)} · تصدير حتى ${fmtD(d.exportUntil)}`
    : st === "view" ? `انتهى ${fmtD(d.end)} · الحذف بعد ${fmtD(d.deleteAfter)}`
    : `منذ ${fmtD(sub.cancelled_at)} · الحذف بعد ${fmtD(d.deleteAfter)}`;
  return (
    <div className="min-w-36">
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SUB_TONE[st]}`}>{SUB_LABEL[st]}</span>
      <div className="mt-1 text-xs text-muted">{line}</div>
      <button onClick={() => setOpen(true)} className="mt-1 text-xs font-semibold text-brand hover:underline">
        إدارة
      </button>
      {open && <SubModal sub={sub} office={office} onClose={() => setOpen(false)} />}
    </div>
  );
}

function SubModal({ sub, office, onClose }: { sub: Sub; office: string; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [plan, setPlan] = useState(sub.plan);
  const [price, setPrice] = useState(sub.price?.toString() ?? "");
  const [cycle, setCycle] = useState(String(sub.cycle_months));
  const [trial, setTrial] = useState(sub.trial_ends);
  const [note, setNote] = useState(sub.note ?? "");
  const [months, setMonths] = useState(String(sub.cycle_months));
  const [amount, setAmount] = useState(sub.price?.toString() ?? "");
  const [paidOn, setPaidOn] = useState(todayStr());
  const [payNote, setPayNote] = useState("");
  const [reason, setReason] = useState("");
  const num = (v: string) => (v.trim() ? Number(v) : null);
  const run = (f: () => Promise<{ ok: boolean; text: string }>) => start(async () => setMsg(await f()));
  const head = "mb-2 text-sm font-semibold";
  return (
    <Modal title="الاشتراك" onClose={onClose} width="max-w-lg">
      <div className="space-y-5 text-sm">
        <section>
          <div className={head}>تسجيل دفعة (تجديد)</div>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="text-xs text-muted">عدد الأشهر</span>
              <input type="number" min={1} value={months} onChange={(e) => setMonths(e.target.value)} className={inputCls} />
            </label>
            <label>
              <span className="text-xs text-muted">المبلغ</span>
              <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
            </label>
            <label>
              <span className="text-xs text-muted">تاريخ الاستلام</span>
              <input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} className={inputCls} />
            </label>
            <label>
              <span className="text-xs text-muted">ملاحظة</span>
              <input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="تحويل بنكي" className={inputCls} />
            </label>
          </div>
          <p className="mt-1 text-xs text-muted">تُضاف الأشهر من نهاية الاشتراك الحالي، أو من نهاية التجربة، أو من يوم الدفع إن كان الاشتراك منتهيًا. وإن سُجّلت خلال 7 أيام من الانتهاء تُكمل المدة من نهاية الاشتراك السابق. التسجيل يعيد الصلاحيات الكاملة فورًا.</p>
          <button disabled={pending} onClick={() => run(() => renewSubscription(office, Number(months), num(amount), paidOn, payNote))} className="mt-2 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white">
            تسجيل الدفعة
          </button>
          {sub.paid_total > 0 && (
            <span className="ms-3 text-xs text-muted">
              المدفوع إجمالًا {sub.paid_total.toLocaleString("en")} · آخر دفعة {fmtD(sub.last_paid)}
            </span>
          )}
        </section>

        <section className="border-t border-line pt-4">
          <div className={head}>بيانات الاشتراك</div>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="text-xs text-muted">الباقة</span>
              <input value={plan} onChange={(e) => setPlan(e.target.value)} className={inputCls} />
            </label>
            <label>
              <span className="text-xs text-muted">السعر لكل دورة</span>
              <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
            </label>
            <label>
              <span className="text-xs text-muted">الدورة</span>
              <select value={cycle} onChange={(e) => setCycle(e.target.value)} className={inputCls}>
                <option value="1">شهرية</option>
                <option value="3">ربع سنوية</option>
                <option value="6">نصف سنوية</option>
                <option value="12">سنوية</option>
              </select>
            </label>
            <label>
              <span className="text-xs text-muted">نهاية التجربة</span>
              <input type="date" value={trial} onChange={(e) => setTrial(e.target.value)} className={inputCls} />
            </label>
            <label className="col-span-2">
              <span className="text-xs text-muted">ملاحظة</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
            </label>
          </div>
          <button disabled={pending} onClick={() => run(() => saveSubscription(office, { plan, price: num(price), cycle: Number(cycle), trialEnds: trial, note }))} className="mt-2 rounded-lg border border-line px-4 py-2 font-semibold hover:border-brand">
            حفظ البيانات
          </button>
        </section>

        {!sub.cancelled_at && (
          <section className="border-t border-line pt-4">
            <div className={head}>إلغاء الاشتراك</div>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="سبب الإلغاء (يفيد في حساب معدل الإلغاء ومعرفة أسبابه)" className={inputCls} />
            <div className="mt-2">
              <Confirm2 label="إلغاء الاشتراك" confirmLabel="تأكيد الإلغاء" onConfirm={() => run(() => cancelSubscription(office, reason))} />
            </div>
          </section>
        )}
        {sub.cancelled_at && <p className="text-xs text-muted">أُلغي في {fmtD(sub.cancelled_at)}{sub.cancel_reason ? `: ${sub.cancel_reason}` : ""}. تسجيل دفعة جديدة يعيد تفعيله.</p>}

        {msg && <p className={msg.ok ? "font-semibold text-emerald-700" : "text-red-700"}>{msg.text}</p>}
      </div>
    </Modal>
  );
}
