"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PANEL_SECTIONS } from "@/lib/panel/nav";

/** The panel's navigation. A fixed rail on desktop, a slide-in drawer on
 *  mobile — the same list either way, so a section is never reachable from one
 *  and not the other. */
export default function PanelSidebar({
  fullName,
  email,
}: {
  fullName: string;
  email: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/panel" ? pathname === "/panel" : pathname.startsWith(href);

  const list = (
    <nav className="flex flex-col gap-1">
      {PANEL_SECTIONS.map((s) => {
        const active = isActive(s.href);
        return (
          <Link
            key={s.href}
            href={s.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`group relative z-20 flex items-start gap-3 rounded-2xl border px-3.5 py-3 transition-all ${
              active
                ? "border-primary/40 bg-primary/10"
                : "border-transparent bg-card hover:border-border"
            }`}
          >
            <span
              aria-hidden
              className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                active ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
              style={active ? undefined : { color: `var(${s.token})` }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                className="size-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={s.icon}
                />
              </svg>
            </span>
            <span className="min-w-0">
              <span
                className={`block text-sm font-bold ${
                  active ? "text-primary" : "text-foreground"
                }`}
              >
                {s.label}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                {s.hint}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );

  const identity = (
    <div className="relative z-20 mb-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-black text-primary"
        >
          {fullName.trim().charAt(0) || "س"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-foreground">
            {fullName}
          </p>
          {email && (
            <p dir="ltr" className="truncate text-[11px] text-muted-foreground">
              {email}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* mobile opener */}
      <button
        onClick={() => setOpen(true)}
        className="relative z-20 mb-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5 lg:hidden"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-foreground">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="size-5 text-primary"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          بخش‌های پنل
        </span>
        <span className="text-xs text-muted-foreground">
          {PANEL_SECTIONS.find((s) => isActive(s.href))?.label ?? ""}
        </span>
      </button>

      {/* desktop rail */}
      <aside className="hidden lg:block">
        <div className="sticky top-24">
          {identity}
          {list}
        </div>
      </aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[90] bg-black/50 lg:hidden"
            />
            <motion.aside
              key="drawer"
              dir="rtl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 right-0 z-[95] w-[86%] max-w-xs overflow-y-auto border-s border-border bg-background p-4 lg:hidden"
            >
              <div className="mb-3 flex justify-end">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-border bg-card px-3 py-1 text-sm font-bold text-muted-foreground"
                >
                  بستن
                </button>
              </div>
              {identity}
              {list}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
