import NewCaseForm from "./form";

export default function NewCasePage() {
  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold">دعوى جديدة</h1>
      <p className="text-sm text-muted">
        إدخال يدوي. الاستيراد التلقائي من ملف الحكم (PDF) يُضاف في الخطوة 7.
      </p>
      <NewCaseForm />
    </div>
  );
}
