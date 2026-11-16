"use client";
import { useEffect, useState } from "react";

// Office rule: important deletes take two clicks. First click arms the button for 4 seconds.
export default function Confirm2({
  label,
  confirmLabel,
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}
      className={`rounded-lg border px-3 py-1 text-sm ${
        armed ? "border-red-600 bg-red-600 text-white" : "border-line text-red-700"
      }`}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}
