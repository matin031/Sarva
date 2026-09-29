"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import MobileDrawer, { DrawerToggle } from "@/components/UI/MobileDrawer";
import { adminNavBadges, type NavBadges } from "@/lib/admin/overview-actions";
import { NAV, NAV_GROUPS, isActive, type NavItem } from "./admin-nav";
import CommandPalette from "./CommandPalette";

const fa = (n: number) => n.toLocaleString("fa-IR");

/**
 * نشانِ «چند کار منتظر است» کنارِ هر بخش.
 *
 * ⚠️ layout در ناوبریِ سمتِ کاربر دوباره رندر نمی‌شود، پس عددِ اولیه‌ای که
 * از سرور آمده با رفتن به صفحهٔ دیگر کهنه می‌ماند. با هر تغییرِ مسیر یک بار
 * تازه خوانده می‌شود — یعنی مدیری که ده گزارش را بسته، وقتی به داشبورد
 * برمی‌گردد عددِ درست را می‌بیند.
 */
function useNavBadges(initial: NavBadges, pathname: string): NavBadges {
  const [badges, setBadges] = useState(initial);
  useEffect(() => {
    let stale = false;
    adminNavBadges()
      .then((b) => {
        if (!stale) setBadges(b);
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [pathname]);
  return badges;
}

function NavList({
  pathname,
  badges,
  mobile = false,
}: {
  pathname: string;
  badges: NavBadges;
  mobile?: boolean;
}) {
  return (
    <>
      {NAV_GROUPS.map((group) => {
        const items = NAV.filter((n) => n.group === group.id);
        if (!items.length) return null;
        return (
          <div key={group.id || "root"} className="flex flex-col gap-0.5">
            {group.title && (
              <span className="px-3 pb-1 pt-4 text-[11px] font-semibold text-muted-foreground/80">
                {group.title}
              </span>
            )}
            {items.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} badge={badges[item.href]} mobile={mobile} />
            ))}
          </div>
        );
      })}
    </>
  );
}

function NavLink({
  item,
  pathname,
  badge,
  mobile,
}: {
  item: NavItem;
  pathname: string;
  badge: number | undefined;
  mobile: boolean;
}) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 text-sm transition-colors ${
        mobile ? "min-h-12" : "py-2"
      } ${
        active
          ? "bg-primary/15 font-semibold text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {item.icon}
      <span className="flex-1">{item.label}</span>
      {badge ? (
        /* ⚠️ عدد و نه فقط یک نقطه: «سه گزارش» و «سی گزارش» دو فوریتِ
           متفاوت‌اند. و `aria-label` تا صفحه‌خوان «۳» را بی‌بافت نخواند. */
        <span
          aria-label={`${fa(badge)} مورد منتظر`}
          className="min-w-5 rounded-full bg-destructive px-1.5 text-center text-[11px] font-semibold leading-5 text-destructive-foreground"
        >
          {badge > 99 ? "۹۹+" : fa(badge)}
        </span>
      ) : null}
    </Link>
  );
}

export default function AdminShell({
  children,
  initialBadges = {},
}: {
  children: ReactNode;
  initialBadges?: NavBadges;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const badges = useNavBadges(initialBadges, pathname);
  const waiting = Object.values(badges).reduce<number>((sum, n) => sum + (n ?? 0), 0);

  // Ctrl+K / ⌘K از هر جای پنل. ⚠️ `preventDefault` لازم است: بدونِ آن،
  // کروم نوارِ جست‌وجوی خودش را هم باز می‌کند.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K" || e.key === "ن")) {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const activeLabel = NAV.find((item) => isActive(pathname, item.href))?.label ?? "پنل مدیریت";

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

        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="mx-3 mt-3 flex min-h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-4" aria-hidden>
            <circle cx="11" cy="11" r="6.5" />
            <path strokeLinecap="round" d="m20 20-4.2-4.2" />
          </svg>
          <span className="flex-1 text-right">جست‌وجو…</span>
          <kbd dir="ltr" className="rounded border border-border px-1 font-sans text-[10px]">Ctrl K</kbd>
        </button>

        {/* ⚠️ `min-h-0` و `overflow-y-auto` هر دو لازم‌اند و هیچ‌کدام به تنهایی
            کافی نیست. `<aside>` ارتفاعِ ثابتِ `h-screen` دارد و این نوار
            شانزده آیتم در هفت دسته — روی لپ‌تاپِ کوتاه بلندتر از صفحه می‌شود. آیتمِ
            `flex-1` به‌طور پیش‌فرض `min-height: auto` دارد، یعنی زیرِ ارتفاعِ
            محتوایش کوچک نمی‌شود؛ پس بدونِ `min-h-0` نوار از پایینِ `aside`
            بیرون می‌زد و «کنسول SQL» و «تنظیمات» اصلاً قابلِ رسیدن نبودند.
            `overscroll-contain` هم جلوی این را می‌گیرد که رسیدن به تهِ فهرست،
            اسکرول را به صفحهٔ پشتِ سر بدهد. */}
        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 pb-3">
          <NavList pathname={pathname} badges={badges} />
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
        {/* ⚠️ اینجا قبلاً هر هشت بخش به‌صورت آیکونِ بی‌برچسب کنار هم می‌نشستند.
            سه مشکل داشت: روی گوشیِ کوچک به هم می‌چسبیدند و هدف لمس کمتر از
            حداقلِ قابل قبول می‌شد، هیچ اسمی دیده نمی‌شد (و tooltip روی لمس
            اصلاً ظاهر نمی‌شود)، و با اضافه شدن هر بخش تازه بدتر می‌شد. */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur md:hidden">
          <div className="flex min-w-0 flex-col">
            <Link href="/admin" className="text-sm font-bold">
              پنل مدیریت
            </Link>
            {/* عنوان بخش فعلی: روی موبایل که نوار کناری دیده نمی‌شود، تنها
                نشانهٔ «کجا هستم» همین است. */}
            <span className="truncate text-[11px] text-muted-foreground">{activeLabel}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="جست‌وجو در پنل"
              className="flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5" aria-hidden>
                <circle cx="11" cy="11" r="6.5" />
                <path strokeLinecap="round" d="m20 20-4.2-4.2" />
              </svg>
            </button>
            <span className="relative">
              <DrawerToggle onClick={() => setDrawerOpen(true)} label="باز کردن منوی مدیریت" />
              {waiting > 0 && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-1.5 top-1.5 size-2.5 rounded-full bg-destructive ring-2 ring-card"
                />
              )}
            </span>
          </div>
        </header>

        <MobileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title="پنل مدیریت"
        >
          <nav className="flex flex-col">
            <NavList pathname={pathname} badges={badges} mobile />
          </nav>

          <Link
            href="/"
            className="mt-3 flex min-h-12 items-center gap-2 rounded-xl border-t border-border px-3 pt-4 text-xs text-muted-foreground hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 18 9 12l6-6" />
            </svg>
            بازگشت به سایت
          </Link>
        </MobileDrawer>

        <main className="flex-1">{children}</main>

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </div>
  );
}
