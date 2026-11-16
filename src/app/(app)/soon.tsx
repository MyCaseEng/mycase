// Placeholder for screens built in later steps.
export default function Soon({ title, step }: { title: string; step: number }) {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="mt-4 rounded-xl border border-dashed border-line bg-white p-6 text-muted">
        هذه الشاشة تُبنى في الخطوة {step} من خطة البناء.
      </div>
    </div>
  );
}
