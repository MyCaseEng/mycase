"use client";
import { useState } from "react";
import Image from "next/image";
import Nav from "./nav";
import { BRAND } from "@/lib/brand";

// Sidebar on wide screens, slide-in menu on phones.
export default function Shell({
  officeName,
  user,
  signOut,
  bell,
  letterhead,
  theme,
  children,
}: {
  theme: React.CSSProperties;
  letterhead: React.ReactNode;
  bell: React.ReactNode;
  officeName: string;
  user: { name: string; role: string };
  signOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const side = (
    <div className="flex h-full flex-col gap-5 p-4">
      <div className="flex items-center gap-3">
        <Image src="/icons/icon-192.png" alt="" width={36} height={36} className="rounded-lg" />
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg font-bold leading-tight text-foreground">{BRAND.name}</div>
          <div className="truncate text-xs text-muted">{officeName}</div>
        </div>
        <span className="hidden md:block">{bell}</span>
      </div>
      <Nav onNavigate={() => setOpen(false)} />
      <div className="mt-auto border-t border-line pt-3 text-sm">
        <div className="font-semibold">{user.name}</div>
        <div className="text-xs text-muted">{user.role}</div>
        <form action={signOut}>
          <button className="mt-2 text-xs text-muted hover:text-red-700">تسجيل الخروج</button>
        </form>
      </div>
    </div>
  );
  return (
    <div className="flex min-h-dvh" style={theme}>
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 border-l border-line bg-white md:block">{side}</aside>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <aside className="absolute inset-y-0 right-0 w-64 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            {side}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-white px-4 py-3 md:hidden">
          <button onClick={() => setOpen(true)} aria-label="القائمة" className="rounded-lg border border-line px-2.5 py-1 text-lg">
            ☰
          </button>
          <span className="flex-1 font-display font-bold text-foreground">{BRAND.name}</span>
          {bell}
        </header>
        {letterhead}
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
