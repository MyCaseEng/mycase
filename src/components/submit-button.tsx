"use client";
import { useFormStatus } from "react-dom";

// A submit button that locks itself while the form is being sent, so a second click cannot submit twice.
export default function SubmitButton({ children, pendingText, className }: { children: React.ReactNode; pendingText: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} aria-busy={pending} className={`${className ?? ""} disabled:cursor-wait disabled:opacity-60`}>
      {pending ? pendingText : children}
    </button>
  );
}
