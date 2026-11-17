"use client";
import { useState, useTransition } from "react";
import Confirm2 from "@/components/confirm2";
import { Modal, inputCls } from "@/components/ui";
import { answerTicket, deleteOffice, setOfficeActive } from "./actions";

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
