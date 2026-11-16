"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "الصفحة الرئيسية" },
  { href: "/cases", label: "الدعاوى" },
  { href: "/schedule", label: "جدول المواعيد" },
  { href: "/refs", label: "سجل الأرقام المرجعية" },
  { href: "/procedures", label: "إجراءات المأمورية" },
  { href: "/team", label: "الفريق والحِمل" },
  { href: "/activity", label: "سجل النشاط" },
  { href: "/settings", label: "الإعدادات" },
];

export default function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.map((it) => {
        const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onNavigate}
            className={`rounded-lg px-3 py-2 text-sm ${
              active ? "bg-brand text-white" : "text-foreground hover:bg-background"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
