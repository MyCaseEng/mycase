"use client";
import { useActionState } from "react";
import { createCase, type Res } from "../actions";
import CaseFields from "../case-fields";
import { Field, Msg, inputCls } from "@/components/ui";
import { ROLES1, ROLES2 } from "@/lib/format";

export default function NewCaseForm() {
  const [res, action, pending] = useActionState<Res, FormData>(createCase, null);
  return (
    <form action={action} className="space-y-6 rounded-xl border border-line bg-white p-5">
      <fieldset className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <legend className="mb-2 font-semibold">الطرفان (يمكن إضافة بقية الأطراف وبياناتهم من صفحة الدعوى)</legend>
        <Field label="صفة الطرف الأول">
          <input name="p1_role" list="roles1" defaultValue="المدعي" className={inputCls} />
        </Field>
        <Field label="اسمه">
          <input name="p1_name" className={inputCls} />
        </Field>
        <Field label="صفة الطرف الثاني">
          <input name="p2_role" list="roles2" defaultValue="المدعى عليه" className={inputCls} />
        </Field>
        <Field label="اسمه">
          <input name="p2_name" className={inputCls} />
        </Field>
        <datalist id="roles1">{ROLES1.map((r) => <option key={r} value={r} />)}</datalist>
        <datalist id="roles2">{ROLES2.map((r) => <option key={r} value={r} />)}</datalist>
      </fieldset>
      <CaseFields />
      <Msg res={res} />
      <button disabled={pending} className="rounded-lg bg-brand px-6 py-2.5 font-semibold text-white disabled:opacity-60">
        {pending ? "جارٍ الحفظ…" : "حفظ الدعوى"}
      </button>
    </form>
  );
}
