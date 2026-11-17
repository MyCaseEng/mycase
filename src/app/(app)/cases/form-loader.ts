// Turns a filled form into a Word file: the office's own template if it uploaded one, else the platform's standard form.
import { fillTemplate, bufToB64 } from "@/lib/docx";
import { accentSwap, type Filled } from "@/lib/forms";
import { getTemplate } from "./doc-actions";

export async function makeForm(f: Filled, src: string | null, country?: string): Promise<Blob> {
  const t = await getTemplate(f.kind, src);
  if ("b64" in t) return fillTemplate(t.b64, f.vars, f.lists);
  const res = await fetch(`/forms/${f.kind}.docx`);
  if (!res.ok) throw new Error("تعذّر تحميل النموذج القياسي، أعد المحاولة.");
  return fillTemplate(bufToB64(await res.arrayBuffer()), f.vars, f.lists, accentSwap(country));
}
