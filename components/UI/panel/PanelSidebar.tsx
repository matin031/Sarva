"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PANEL_SECTIONS } from "@/lib/panel/nav";

/** The panel's navigation: a plain list of section names.
 *
 *  No icons, no per-item colour, no second line of explanatory text — six
 *  labels do not need decorating, and the earlier version's coloured icon tiles
 *  made the rail louder than the content beside it. */
export default function PanelSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/panel" ? pathname === "/panel" : pathname.startsWith(href);

  const list = (
    <nav className="flex flex-col">
      {PANEL_SECTIONS.map((s) => {
        const active = isActive(s.href);
        return (
          <Link
            key={s.href}
            href={s.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`border-e-2 py-2.5 pe-4 text-sm transition-colors ${
              active
                ? "border-primary font-bold text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* mobile: a single row of the current section */}
      <button
        onClick={() => setOpen(true)}
        className="mb-6 flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 lg:hidden"
      >
        <span className="text-sm font-bold text-foreground">
          {PANEL_SECTIONS.find((s) => isActive(s.href))?.label ?? "پنل"}
        </span>
        <span className="text-xs text-muted-foreground">تغییر بخش</span>
      </button>

      <aside className="hidden lg:block">
        <div className="sticky top-24">{list}</div>
      </aside>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[90] bg-black/40 lg:hidden"
            />
            <motion.aside
              key="drawer"
              dir="rtl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="fixed inset-y-0 right-0 z-[95] w-72 overflow-y-auto border-s border-border bg-background p-6 lg:hidden"
            >
              <div className="mb-6 flex justify-end">
                <button
                  onClick={() => setOpen(false)}
                  className="text-sm text-muted-foreground"
                >
                  بستن
                </button>
              </div>
              {list}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
