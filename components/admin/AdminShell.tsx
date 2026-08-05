"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  {
    href: "/admin",
    label: "داشبورد",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 9.5V21h14V9.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 21v-6h5v6" />
      </svg>
    ),
  },
  {
    href: "/admin/exams",
    label: "امتحانات نهایی",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 17.5v-12Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 17.5a2.5 2.5 0 0 1 2.5-2.5H20" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7.5h8M8 10.5h5" />
      </svg>
    ),
  },
  {
    href: "/admin/quiz",
    label: "عروض سماعی",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 18V6l11-2v12" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="17" cy="16" r="3" />
      </svg>
    ),
  },
  {
    href: "/admin/vocab",
    label: "واژه‌یاب",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m3 14 4.5-4a2 2 0 0 1 2.7 0L15 14" />
        <circle cx="15.5" cy="8.5" r="1.5" />
      </svg>
    ),
  },
  {
    href: "/admin/club",
    label: "سروا کلاب",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5.5A2.5 2.5 0 0 1 6.5 3h9a2.5 2.5 0 0 1 2.5 2.5V15a2.5 2.5 0 0 1-2.5 2.5h-6L5 21v-3.5A2.5 2.5 0 0 1 4 15V5.5Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h6M8 11.5h4" />
      </svg>
    ),
  },
  {
    href: "/admin/users",
    label: "کاربران",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
        <circle cx="9" cy="8" r="3.25" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 19.5c.7-3.4 3-5.25 5.5-5.25s4.8 1.85 5.5 5.25" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 5.1a3.25 3.25 0 0 1 0 6.3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.7 14.3c2.1.5 3.6 2.2 4.1 5.2" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div dir="rtl" className="flex min-h-screen bg-muted/30">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-l border-border bg-card md:flex">
        <Link href="/admin" className="flex items-center gap-2 border-b border-border px-5 py-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            ع
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-bold">پنل مدیریت</span>
            <span className="text-[11px] text-muted-foreground">سروا</span>
          </div>
        </Link>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-primary/15 font-semibold text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/"
          className="flex items-center gap-2 border-t border-border px-5 py-4 text-xs text-muted-foreground hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 18 9 12l6-6" />
          </svg>
          بازگشت به سایت
        </Link>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/admin" className="text-sm font-bold">
            پنل مدیریت
          </Link>
          <nav className="flex gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex size-9 items-center justify-center rounded-lg ${
                  isActive(pathname, item.href) ? "bg-primary/15 text-primary" : "text-muted-foreground"
                }`}
              >
                {item.icon}
              </Link>
            ))}
          </nav>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
