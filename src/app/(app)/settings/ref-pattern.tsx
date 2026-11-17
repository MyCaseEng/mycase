"use client";
// The office's reference-number pattern: tokens in any order with any separators, with a live example.
import { useRef, useState } from "react";
import { DEFAULT_PATTERN, REF_TOKENS, formatRef, showRef } from "@/lib/refs";

export default function RefPatternField({ initial, reg, disabled }: { initial: string; reg: string; disabled: boolean }) {
  const [v, setV] = useState(initial || DEFAULT_PATTERN);
  const box = useRef<HTMLInputElement>(null);
  const year = new Date().getFullYear();
  const insert = (t: string) => {
    const el = box.current;
    const at = el?.selectionStart ?? v.length;
    const next = v.slice(0, at) + t + v.slice(el?.selectionEnd ?? at);
    setV(next);
    requestAnimationFrame(() => el?.setSelectionRange(at + t.length, at + t.length));
  };
  const ok = v.includes("{تسلسل}");
  return (
    <div className="space-y-2">
      <span className="text-sm text-muted">صيغة الرقم المرجعي لمكتبك</span>
      <input ref={box} name="refPattern" dir="rtl" value={v} onChange={(e) => setV(e.target.value)} disabled={disabled} className="w-full rounded-lg border border-line px-3 py-2 font-mono disabled:bg-background" />
      {!disabled && (
        <div className="flex flex-wrap gap-1.5">
          {REF_TOKENS.map(([t, l]) => (
            <button key={t} type="button" onClick={() => insert(t)} className="rounded-full border border-line px-2.5 py-0.5 text-xs hover:border-brand">
              + {l}
            </button>
          ))}
          <button type="button" onClick={() => setV(DEFAULT_PATTERN)} className="rounded-full px-2.5 py-0.5 text-xs text-muted hover:text-brand">
            الصيغة القياسية
          </button>
        </div>
      )}
      <div className="rounded-lg bg-background px-3 py-2 text-sm">
        مثال:{" "}
        <b>{showRef(formatRef(v, { reg: reg || "1234", cat: "محضر اجتماع", seq: 2, year, caseNo: "888 - 2026" }))}</b>
        <span className="ms-2 text-xs text-muted">(محضر اجتماع، المستند الثاني في السنة)</span>
        {!reg && <span className="ms-2 text-xs text-muted">(رقم القيد في المثال افتراضي، أدخل رقمك في بيانات المكتب)</span>}
      </div>
      {!ok && <p className="text-xs text-red-700">يجب أن تحتوي الصيغة على التسلسل {"{تسلسل}"}.</p>}
      <p className="text-xs text-muted">التسلسل واحد لكل مستندات المكتب، ويبدأ من 001 مع كل سنة جديدة. الأرقام الصادرة سابقاً تبقى كما صدرت.</p>
    </div>
  );
}
