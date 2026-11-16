"use client";
// Small shared form pieces so every screen looks the same.
import { useEffect, useRef } from "react";

export const inputCls = "mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-brand";

export function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}

export function Modal({ title, onClose, children, width = "max-w-2xl" }: { title: string; onClose: () => void; children: React.ReactNode; width?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    ref.current?.querySelector<HTMLElement>("input,select,textarea")?.focus();
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-4" onMouseDown={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className={`mt-10 w-full ${width} rounded-2xl bg-white p-6 shadow-xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <h3 className="flex-1 text-lg font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="إغلاق" className="text-xl text-muted">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Msg({ res }: { res: { ok: boolean; text: string } | null }) {
  if (!res || !res.text) return null;
  return <p className={`text-sm ${res.ok ? "text-green-700" : "text-red-700"}`}>{res.text}</p>;
}
