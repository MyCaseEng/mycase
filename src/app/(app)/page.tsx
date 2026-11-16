import { getCtx, ROLE_LABEL } from "@/lib/office";

export default async function Home() {
  const ctx = await getCtx();
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">مرحباً {ctx.displayName}</h1>
      <p className="text-muted">
        {ctx.officeName} · {ROLE_LABEL[ctx.role]}
      </p>
      <div className="rounded-xl border border-dashed border-line bg-white p-6 text-muted">
        لوحة المواعيد وسير الدعاوى تُبنى في الخطوة 5. ابدأ الآن بإضافة زملائك من صفحة «الفريق والحِمل».
      </div>
    </div>
  );
}
