"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/UI/Modal";
import { adminListUsers, type AdminUserRow } from "@/lib/admin/user-actions";
import { NAV } from "./admin-nav";

/**
 * جست‌وجوی سریع — `Ctrl+K` یا `⌘K` از هر جای پنل.
 *
 * دو کار: رفتن به هر بخشِ پنل با چند حرف، و پیدا کردنِ یک کاربر بدونِ اینکه
 * اول به صفحهٔ کاربران رفت و فیلتر زد. پشتیبانی تقریباً همیشه با «فلانی
 * می‌گوید…» شروع می‌شود؛ این میان‌بُر همان را یک قدم می‌کند.
 *
 * ⚠️ جست‌وجوی کاربر همان `adminListUsers` است — همان گارد، همان سقف — و نه
 * یک endpointِ تازه. پنجره فقط وقتی کاربر دو حرف تایپ کرده کوئری می‌زند.
 */

type Item =
  | { kind: "page"; href: string; label: string; hint: string; icon: React.ReactNode }
  | { kind: "user"; href: string; label: string; hint: string };

const normalize = (s: string) =>
  s
    .toLowerCase()
    // ی و ک عربی ↔ فارسی، تا «كاربر» تایپ‌شده با کیبوردِ عربی هم پیدا شود.
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/‌/g, " ")
    .trim();

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <Palette onClose={onClose} />;
}

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const titleId = useId();
  const listId = useId();
  const [term, setTerm] = useState("");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement | null>(null);

  const pages = useMemo<Item[]>(() => {
    const q = normalize(term);
    return NAV.filter((n) => !q || normalize(`${n.label} ${n.keywords}`).includes(q)).map((n) => ({
      kind: "page" as const,
      href: n.href,
      label: n.label,
      hint: "بخش",
      icon: n.icon,
    }));
  }, [term]);

  // ⚠️ تأخیر و «فقط آخرین پاسخ»: بدونِ `stale`، پاسخِ «عل» می‌توانست بعد از
  // پاسخِ «علی» برسد و فهرستِ درست را بازنویسی کند.
  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) return;
    let stale = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const result = await adminListUsers({ query: q, limit: 6 });
        if (!stale) setUsers(result.users);
      } catch {
        if (!stale) setUsers([]);
      } finally {
        if (!stale) setSearching(false);
      }
    }, 250);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [term]);

  const userItems: Item[] =
    term.trim().length < 2
      ? []
      : users.map((u) => ({
          kind: "user" as const,
          href: `/admin/users/${u.id}`,
          label: u.fullName || u.email || u.phone || u.id,
          hint: u.email || u.phone || "",
        }));

  const items = [...pages, ...userItems];
  const current = Math.min(active, Math.max(items.length - 1, 0));

  const go = (item: Item | undefined) => {
    if (!item) return;
    onClose();
    router.push(item.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (items.length ? (Math.min(i, items.length - 1) + 1) % items.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (items.length ? (Math.min(i, items.length - 1) - 1 + items.length) % items.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(items[current]);
    }
  };

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${current}"]`)?.scrollIntoView({ block: "nearest" });
  }, [current]);

  return (
    <Modal onClose={onClose} labelledBy={titleId} className="max-w-lg overflow-hidden">
      <h2 id={titleId} className="sr-only">
        جست‌وجوی سریع در پنل
      </h2>
      <div className="flex items-center gap-2 border-b border-border px-4">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5 shrink-0 text-muted-foreground" aria-hidden>
          <circle cx="11" cy="11" r="6.5" />
          <path strokeLinecap="round" d="m20 20-4.2-4.2" />
        </svg>
        <input
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setActive(0);
            if (e.target.value.trim().length < 2) setUsers([]);
          }}
          onKeyDown={onKeyDown}
          placeholder="بخش یا کاربر (نام، ایمیل، موبایل)…"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={items.length ? `${listId}-${current}` : undefined}
          className="min-h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {searching && <span className="text-xs text-muted-foreground">در حال جست‌وجو…</span>}
      </div>

      <ul ref={listRef} id={listId} role="listbox" className="max-h-[55vh] overflow-y-auto p-2">
        {items.length === 0 ? (
          <li className="p-6 text-center text-sm text-muted-foreground">
            {term.trim().length >= 2 && !searching ? "چیزی پیدا نشد." : "چیزی بنویسید…"}
          </li>
        ) : (
          items.map((item, i) => {
            const firstUser = item.kind === "user" && (i === 0 || items[i - 1].kind !== "user");
            return (
              <li key={`${item.kind}:${item.href}`} role="presentation">
                {firstUser && (
                  <div className="px-3 pb-1 pt-3 text-[11px] font-semibold text-muted-foreground">کاربران</div>
                )}
                <button
                  type="button"
                  id={`${listId}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={i === current}
                  tabIndex={-1}
                  onMouseMove={() => setActive(i)}
                  onClick={() => go(item)}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-right text-sm transition-colors ${
                    i === current ? "bg-primary/12 text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {item.kind === "page" ? (
                    <span className={i === current ? "text-primary" : ""}>{item.icon}</span>
                  ) : (
                    <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
                      {item.label.slice(0, 1)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.hint && (
                    <span className="max-w-[45%] truncate text-xs text-muted-foreground" dir={item.kind === "user" ? "ltr" : undefined}>
                      {item.hint}
                    </span>
                  )}
                </button>
              </li>
            );
          })
        )}
      </ul>

      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
        <span>
          <kbd className="rounded border border-border px-1">↑</kbd> <kbd className="rounded border border-border px-1">↓</kbd> جابه‌جایی ·{" "}
          <kbd className="rounded border border-border px-1">Enter</kbd> باز کردن
        </span>
        <span>
          <kbd className="rounded border border-border px-1">Esc</kbd> بستن
        </span>
      </div>
    </Modal>
  );
}
