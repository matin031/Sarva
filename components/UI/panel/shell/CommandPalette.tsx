"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { CornerDownLeft, Gamepad2, House, Search, type LucideIcon } from "lucide-react";
import { PANEL_NAV } from "./nav";
import styles from "../panel-design.module.css";

type Item = { title: string; group: string; href: string; icon: LucideIcon };

const ITEMS: Item[] = [
  ...PANEL_NAV.flatMap((g) =>
    g.items.map((i) => ({ title: i.title, group: g.label, href: i.href ?? `/panel/${i.src}`, icon: i.icon })),
  ),
  { title: "همهٔ تمرین‌ها", group: "سروا", href: "/game", icon: Gamepad2 },
  { title: "صفحهٔ اصلی سروا", group: "سروا", href: "/", icon: House },
];

/** «ي» و «ك» عربی را یکی می‌کند تا جست‌وجو با کیبوردِ عربی هم پیدا کند. */
const norm = (s: string) => s.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/‌/g, " ").trim();

/**
 * پرش سریع بین بخش‌های پنل — Ctrl+K یا ⌘K.
 *
 * ⚠️ روی Radix Dialog ساخته شده و نه یک div دست‌ساز: تلهٔ فوکوس، Escape و
 * بازگرداندنِ فوکوس به دکمه را Radix درست انجام می‌دهد.
 */
export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (item: Item) => {
    setOpen(false);
    router.push(item.href);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className={styles.searchTrigger} aria-label="جست‌وجو در پنل">
        <Search aria-hidden className="size-4" />
        <span className="hidden md:inline">جست‌وجو…</span>
        <kbd className="hidden md:inline" dir="ltr">
          Ctrl K
        </kbd>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-100 bg-background/60 backdrop-blur-sm" />
        {/* ⚠️ جست‌وجو در یک کامپوننتِ جدا که با بسته شدن unmount می‌شود: هر بار
            باز شدن (چه با دکمه، چه با Ctrl+K) از جست‌وجوی خالی شروع می‌شود. */}
        <PaletteBody onGo={go} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PaletteBody({ onGo }: { onGo: (item: Item) => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const needle = norm(q);
    return needle ? ITEMS.filter((i) => norm(i.title).includes(needle) || norm(i.group).includes(needle)) : ITEMS;
  }, [q]);

  return (
        <Dialog.Content
          dir="rtl"
          className="panel-scope fixed inset-x-4 top-[12vh] z-101 mx-auto max-w-lg overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (results[active]) onGo(results[active]);
            }
          }}
        >
          <Dialog.Title className="sr-only">جست‌وجو در پنل</Dialog.Title>
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search aria-hidden className="size-4.5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              placeholder="کجا بروم؟"
              aria-label="جست‌وجو"
              aria-controls="panel-command-list"
              aria-activedescendant={results[active] ? `cmd-${results[active].href}` : undefined}
              className="h-14 min-w-0 flex-1 bg-transparent text-[15px] outline-none! placeholder:text-muted-foreground"
            />
          </div>
          <ul id="panel-command-list" role="listbox" className="max-h-[55vh] overflow-y-auto p-2">
            {results.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">چیزی پیدا نشد.</li>}
            {results.map((item, i) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.href}
                  id={`cmd-${item.href}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={() => onGo(item)}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-sm aria-selected:bg-primary/10 aria-selected:text-primary"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-foreground/5">
                    <Icon aria-hidden className="size-4" />
                  </span>
                  <span className="flex-1">{item.title}</span>
                  <span className="text-[11px] text-muted-foreground">{item.group}</span>
                  {i === active && <CornerDownLeft aria-hidden className="size-3.5 text-muted-foreground" />}
                </li>
              );
            })}
          </ul>
        </Dialog.Content>
  );
}
