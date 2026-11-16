"use client";
import { Field, inputCls } from "@/components/ui";
import { CATS, SRCS } from "@/lib/format";
import type { Case } from "@/lib/cases";

// The case data fields, shared by "new case" and "edit case data".
export default function CaseFields({ c }: { c?: Partial<Case> }) {
  return (
    <div className="space-y-5">
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">المحكمة والدعوى</legend>
        <Field label="رقم الدعوى (مثل 888 - 2026)">
          <input name="case_no" dir="ltr" defaultValue={c?.case_no ?? ""} className={inputCls + " text-right"} />
        </Field>
        <Field label="نوع الدعوى (مثل ابتدائي مدني كلي)">
          <input name="case_type" defaultValue={c?.case_type ?? ""} className={inputCls} />
        </Field>
        <Field label="النوع">
          <select name="category" defaultValue={c?.category ?? "محكمة"} className={inputCls}>
            {CATS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="جهة التكليف">
          <select name="assign_src" defaultValue={c?.assign_src ?? "auto"} className={inputCls}>
            <option value="auto">تلقائي حسب الجهة</option>
            {SRCS.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
            <option value="none">بدون تصنيف</option>
          </select>
        </Field>
        <Field label="الجهة (المحكمة أو اللجنة)">
          <input name="authority" defaultValue={c?.authority ?? ""} className={inputCls} />
        </Field>
        <Field label="الدائرة">
          <input name="circuit" defaultValue={c?.circuit ?? ""} className={inputCls} />
        </Field>
        <Field label="القاضي">
          <input name="judge" defaultValue={c?.judge ?? ""} className={inputCls} />
        </Field>
        <Field label="أمين السر">
          <input name="secretary" defaultValue={c?.secretary ?? ""} className={inputCls} />
        </Field>
        <Field label="رقم المأمورية (إن وجد)">
          <input name="mission" defaultValue={c?.mission ?? ""} className={inputCls} />
        </Field>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="mb-2 font-semibold">التواريخ والمهل</legend>
        <Field label="تاريخ الورود">
          <input type="date" name="received" defaultValue={c?.received ?? ""} className={inputCls} />
        </Field>
        <Field label="تاريخ الحكم التمهيدي">
          <input type="date" name="prelim_date" defaultValue={c?.prelim_date ?? ""} className={inputCls} />
        </Field>
        <Field label="الموعد النهائي للتقرير">
          <input type="date" name="deadline" defaultValue={c?.deadline ?? ""} className={inputCls} />
        </Field>
        <label className="block sm:col-span-3">
          <span className="text-sm text-muted">المهلة كما وردت في الحكم</span>
          <textarea name="due_note" rows={2} defaultValue={c?.due_note ?? ""} className={inputCls} />
        </label>
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-3">
        <legend className="mb-2 font-semibold">الأمانة والمبالغ (ريال قطري)</legend>
        <Field label="الأمانة المقررة">
          <input name="deposit_ordered" inputMode="numeric" dir="ltr" defaultValue={c?.deposit_ordered ?? ""} className={inputCls + " text-right"} />
        </Field>
        <Field label="قيمة المطالبة">
          <input name="claim_value" inputMode="numeric" dir="ltr" defaultValue={c?.claim_value ?? ""} className={inputCls + " text-right"} />
        </Field>
        <Field label="قيمة المشروع">
          <input name="project_value" inputMode="numeric" dir="ltr" defaultValue={c?.project_value ?? ""} className={inputCls + " text-right"} />
        </Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-3">
          <input type="checkbox" name="supplementary" defaultChecked={!!c?.supplementary} /> المطلوب تقرير تكميلي
        </label>
      </fieldset>
    </div>
  );
}
