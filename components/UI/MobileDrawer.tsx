"use client";

import { useEffect, useId, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * کشوی موبایل — مکانیزم مشترکِ پنل مدیریت و پنل کاربر.
 *
 * فقط رفتار را می‌دهد، نه ظاهر: هر پوسته محتوای خودش را می‌فرستد. چیزی که
 * مشترک است و در هر دو جا اگر دستی نوشته شود یک‌جا فراموش می‌شود:
 *
 *   • بستن با Escape و با کلیک روی پس‌زمینه
 *   • نگه داشتن فوکوس داخل کشو (وگرنه Tab کاربر را به صفحهٔ پشت می‌برد در
 *     حالی که کشو باز است و صفحه از نظر بصری قفل به نظر می‌رسد)
 *   • قفل اسکرول صفحهٔ پشت
 *   • بستنِ خودکار بعد از رفتن به مسیر تازه — که مهم‌ترینشان است: بدون آن،
 *     کاربر روی یک لینک می‌زند، صفحه عوض می‌شود، و کشو باز می‌ماند و رویش را
 *     می‌پوشاند.
 *   • احترام به prefers-reduced-motion
 */

export type MobileDrawerProps = {
  open: boolean;
  onClose: () => void;
  /** عنوانی که صفحه‌خوان می‌خواند. */
  title: string;
  children: React.ReactNode;
};

export default function MobileDrawer({ open, onClose, title, children }: MobileDrawerProps) {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();

  // بستن با تغییر مسیر.
  //
  // به pathname وابسته است و نه به کلیکِ روی لینک: با این کار هر راهِ رسیدن به
  // صفحهٔ تازه — لینک، دکمهٔ back مرورگر، router.push از جای دیگر — کشو را
  // می‌بندد. onClose در ref نگه داشته می‌شود تا تابعِ inline والد باعث اجرای
  // دوبارهٔ افکت نشود.
  const closeRefFn = useRef(onClose);
  useEffect(() => {
    closeRefFn.current = onClose;
  }, [onClose]);

  const firstPath = useRef(pathname);
  useEffect(() => {
    if (pathname === firstPath.current) return;
    firstPath.current = pathname;
    closeRefFn.current();
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRefFn.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    /* z-300 و نه چیزی کمتر: هدر خودِ سایت (components/UI/Header.tsx) روی
       z-200 می‌نشیند، و کشو باید بالای آن باشد وگرنه منوی سایت روی منوی پنل
       می‌افتد — دقیقاً همان چیزی که در تست موبایل دیده شد. */
    <div className="fixed inset-0 z-[300] md:hidden" dir="rtl">
      <button
        type="button"
        aria-label="بستن منو"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm motion-safe:animate-[fadeIn_150ms_ease-out]"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // از راست می‌آید چون کل رابط راست‌چین است — کشویی که از چپ بیاید در
        // RTL حس «برگشت» می‌دهد نه «منو».
        className="absolute inset-y-0 right-0 flex w-[min(19rem,85vw)] flex-col border-l border-border bg-card shadow-2xl motion-safe:animate-[slideInRight_200ms_cubic-bezier(0.22,1,0.36,1)]"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-4">
          <h2 id={titleId} className="text-sm font-bold">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="بستن منو"
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-3">{children}</div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }
      `}</style>
    </div>
  );
}

/** دکمهٔ همبرگری — همان ظاهر در هر دو پنل. */
export function DrawerToggle({
  onClick,
  label = "باز کردن منو",
  badge,
}: {
  onClick: () => void;
  label?: string;
  /** عددی که روی دکمه می‌نشیند، مثلاً تعداد خطاهای رسیدگی‌نشده. */
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative flex size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:border-primary/50"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -left-1 -top-1 flex min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {badge.toLocaleString("fa-IR")}
        </span>
      )}
    </button>
  );
}
