// Shown instantly when moving between pages, while the page's data loads; the sidebar stays in place.
export default function Loading() {
  return (
    <div className="max-w-5xl animate-pulse space-y-4" aria-busy="true" aria-label="جارٍ التحميل">
      <div className="h-8 w-48 rounded-lg bg-line" />
      <div className="h-10 w-full rounded-lg bg-white" />
      <div className="space-y-2 rounded-xl border border-line bg-white p-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-10 rounded-lg bg-background" />
        ))}
      </div>
    </div>
  );
}
