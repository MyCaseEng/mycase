"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

// Icons are the same line icons as the first platform.
const ICON: Record<string, React.ReactNode> = {
  "/": <><path d="M4 11l8-7 8 7" /><path d="M6 9.5V20h4v-5h4v5h4V9.5" /></>,
  "/cases": <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M8 13h8" /></>,
  "/schedule": <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="M8 14h3" /></>,
  "/refs": <path d="M9 4L7 20M17 4l-2 16M4 9h16M3.5 15h16" />,
  "/procedures": <><path d="M8 6h12M8 12h12M8 18h12" /><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></>,
  "/team": <><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><circle cx="17" cy="9" r="2.4" /><path d="M15.5 14.2A4.5 4.5 0 0 1 21 18.5" /></>,
  "/activity": <><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" /><path d="M3 4v4h4" /><path d="M12 8v4l3 2" /></>,
  "/guide": <><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" /><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" /><path d="M9 7.5h6M9 11h4" /></>,
  "/platform": <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
  "/settings": <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
};

// shows at once that a click was registered, while the next page loads
function Pending() {
  const { pending } = useLinkStatus();
  return pending ? <span aria-hidden className="absolute inset-x-2 bottom-0 h-0.5 animate-pulse rounded-full bg-brand" /> : null;
}

const ITEMS = [
  { href: "/", label: "الصفحة الرئيسية" },
  { href: "/cases", label: "الدعاوى" },
  { href: "/schedule", label: "جدول المواعيد" },
  { href: "/refs", label: "سجل الأرقام المرجعية" },
  { href: "/procedures", label: "إجراءات المأمورية" },
  { href: "/team", label: "الفريق والحِمل" },
  { href: "/activity", label: "سجل النشاط" },
  { href: "/settings", label: "الإعدادات" },
  { href: "/guide", label: "الدليل" },
];

export default function Nav({ onNavigate, horizontal, owner }: { onNavigate?: () => void; horizontal?: boolean; owner?: boolean }) {
  const path = usePathname();
  const items = owner ? [...ITEMS, { href: "/platform", label: "لوحة المنصة" }] : ITEMS;
  return (
    <nav className={horizontal ? "flex flex-nowrap items-stretch" : "flex flex-col gap-1"}>
      {items.map((it) => {
        const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onNavigate}
            className={
              horizontal
                ? // top bar: a thin line under the open page
                  `relative flex items-center gap-1.5 border-b-2 px-2 py-3 text-sm whitespace-nowrap transition-colors 2xl:px-3 ${
                    active ? "border-brand font-semibold text-brand" : "border-transparent text-muted hover:border-line hover:text-foreground"
                  }`
                : `relative flex items-center gap-2.5 border-s-[3px] px-3 py-2 text-sm transition-colors ${
                    active ? "border-brand bg-brand-soft font-semibold text-brand" : "border-transparent text-muted hover:bg-background hover:text-foreground"
                  }`
            }
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              aria-hidden="true"
              className={`flex-none ${active ? "" : "opacity-85"} ${horizontal ? "hidden 2xl:block" : ""}`}
            >
              <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {ICON[it.href]}
              </g>
            </svg>
            {it.label}
            <Pending />
          </Link>
        );
      })}
    </nav>
  );
}
