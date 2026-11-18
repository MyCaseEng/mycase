"use client";
// Country list with round flags (a plain <select> cannot show pictures). Sends its value as a normal form field.
import { useEffect, useRef, useState } from "react";
import { COUNTRIES, DEFAULT_COUNTRY, flagUrl } from "@/lib/countries";

export default function CountryPicker({ name, defaultValue }: { name: string; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue || DEFAULT_COUNTRY);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const name_ = COUNTRIES.find(([c]) => c === value)?.[1] ?? "";
  return (
    <div ref={box} className="relative mt-1">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-start text-foreground outline-none focus:border-brand"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={flagUrl(value)} alt="" className="size-5 rounded-full" />
        <span className="flex-1">{name_}</span>
        <span className="text-xs text-muted">▾</span>
      </button>
      {open && (
        <ul role="listbox" className="absolute inset-x-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-lg">
          {COUNTRIES.map(([c, n]) => (
            <li key={c}>
              <button
                type="button"
                role="option"
                aria-selected={c === value}
                onClick={() => {
                  setValue(c);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-start text-sm text-foreground hover:bg-background ${c === value ? "bg-brand-soft font-semibold" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagUrl(c)} alt="" loading="lazy" className="size-5 rounded-full" />
                {n}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
