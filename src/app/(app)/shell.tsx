"use client";
import { useState } from "react";
import Image from "next/image";
import Nav from "./nav";
import { BRAND } from "@/lib/brand";

// Wide screens: letterhead, then a top bar with the pages laid out horizontally (it stays on screen when scrolling).
// Narrower screens: the same bar with a ☰ button that opens the pages as a side menu.
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
  const logo = (
    <div className="flex min-w-0 items-center gap-2.5">
      <Image src="/icons/icon-192.png" alt="" width={32} height={32} className="rounded-lg" />
      <div className="min-w-0">
        <div className="font-display text-base font-bold leading-tight text-foreground">{BRAND.name}</div>
        <div className="max-w-40 truncate text-[11px] text-muted">{officeName}</div>
      </div>
    </div>
  );
  return (
    <div className="flex min-h-dvh flex-col" style={theme}>
      {letterhead}
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1560px] items-center gap-4 px-4 lg:px-8">
          <button onClick={() => setOpen(true)} aria-label="القائمة" className="my-2 rounded-lg border border-line px-2.5 py-1 text-lg xl:hidden">
            ☰
          </button>
          <div className="py-2">{logo}</div>
          <div className="hidden min-w-0 flex-1 justify-center xl:flex">
            <Nav horizontal />
          </div>
          <div className="ms-auto flex items-center gap-3 xl:ms-0">
            {bell}
            <div className="hidden text-left text-xs leading-tight sm:block">
              <div className="font-semibold text-foreground">{user.name}</div>
              <form action={signOut} className="flex gap-1.5 text-muted">
                <span>{user.role}</span>·<button className="hover:text-red-700">خروج</button>
              </form>
            </div>
          </div>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 xl:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <aside className="absolute inset-y-0 right-0 flex w-64 flex-col gap-5 bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {logo}
            <Nav onNavigate={() => setOpen(false)} />
            <div className="mt-auto border-t border-line pt-3 text-sm">
              <div className="font-semibold">{user.name}</div>
              <div className="text-xs text-muted">{user.role}</div>
              <form action={signOut}>
                <button className="mt-2 text-xs text-muted hover:text-red-700">تسجيل الخروج</button>
              </form>
            </div>
          </aside>
        </div>
      )}
      <main className="flex-1 px-4 py-5 md:px-8 md:py-8">
        {/* one content width for every page, lined up with the top bar */}
        <div className="mx-auto w-full max-w-[1500px]">{children}</div>
      </main>
    </div>
  );
}
