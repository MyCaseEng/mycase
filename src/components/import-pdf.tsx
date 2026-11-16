"use client";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Extracted } from "@/lib/extract";

// Upload the PDF straight to the office's private storage folder, then ask the server to read it with Claude.
export default function ImportPdf({ officeId, folder, onDone, label = "استيراد من ملف PDF" }: { officeId: string; folder: string; onDone: (ex: Extracted, path: string) => void; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"" | "upload" | "read">("");
  const [err, setErr] = useState("");
  const [over, setOver] = useState(false);

  async function run(file: File) {
    setErr("");
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") return setErr("الملف يجب أن يكون PDF.");
    if (file.size > 50 * 1024 * 1024) return setErr("حجم الملف أكبر من 50 ميغابايت.");
    try {
      setStep("upload");
      const path = `${officeId}/${folder}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.pdf`;
      const { error } = await createClient().storage.from("case-files").upload(path, file, { contentType: "application/pdf" });
      if (error) throw new Error(/bucket/i.test(error.message) ? "مخزن الملفات غير مُعدّ بعد (نفّذ أوامر SQL للخطوة 7 في Supabase)." : error.message);
      setStep("read");
      const r = await fetch("/api/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path }) });
      const j = await r.json().catch(() => ({ error: "انقطع الاتصال أثناء القراءة. أعد المحاولة." }));
      if (!r.ok || !j.ok) throw new Error(j.error || "تعذّرت القراءة.");
      onDone(j.ex as Extracted, path);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setStep("");
    }
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) run(f); }}
      className={`rounded-xl border-2 border-dashed p-5 text-center ${over ? "border-brand bg-blue-50" : "border-line bg-white"}`}
    >
      <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) run(f); e.target.value = ""; }} />
      {step ? (
        <div className="space-y-1 text-sm">
          <div className={step === "upload" ? "font-semibold text-brand" : "text-green-700"}>{step === "upload" ? "١. رفع الملف…" : "✓ رُفع الملف"}</div>
          <div className={step === "read" ? "animate-pulse font-semibold text-brand" : "text-muted"}>٢. Claude يقرأ كل صفحات الملف ويبحث عن الحكم التمهيدي (قد يستغرق دقيقة أو اثنتين)</div>
        </div>
      ) : (
        <>
          <button type="button" onClick={() => input.current?.click()} className="rounded-lg bg-brand px-5 py-2 font-semibold text-white">
            {label}
          </button>
          <p className="mt-2 text-xs text-muted">أو اسحب الملف إلى هنا. يُقرأ الملف كله، والحكم التمهيدي قد يكون في أي صفحة. يُحفظ الملف مع الدعوى.</p>
        </>
      )}
      {err && <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</p>}
    </div>
  );
}
