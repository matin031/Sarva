"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, ArrowUpLeft, ChevronLeft } from "lucide-react";
import Link from "next/link";
import DarkModeButton from "@/components/UI/DarkModeButton";
import PaletteButton from "@/components/UI/PaletteButton";
import NotificationBell from "@/components/UI/panel/NotificationBell";
import { Sheet, SheetContent, SheetTrigger } from "@/components/UI/kit/sheet";
import { usePanelUi } from "@/lib/panel/ui-store";
import { titleOf } from "./nav";
import { PanelSidebarBody } from "./PanelSidebar";
import CommandPalette from "./CommandPalette";
import styles from "../panel-design.module.css";

/**
 * نوارِ بالای پنل — **یک** نوار.
 *
 * ⚠️ در طرحِ اول این دو نوار بود: یکی برای مسیرِ صفحه و یکی برای جست‌وجو.
 * برای پنلی که ده صفحهٔ هم‌سطح دارد و هیچ‌کدام تودرتو نیستند، مسیرِ
 * چندمرحله‌ای اطلاعاتی اضافه نمی‌کرد؛ نامِ صفحه کافی است و بقیهٔ نوار به
 * کارهای واقعی می‌رسد.
 *
 * ── سه اشکالی که این نوار داشت ────────────────────────────────────────────
 * روی نمایشگرِ پهن، نوار شبیهِ یک مستطیلِ سفیدِ رها شده در بالای صفحه دیده
 * می‌شد. هر سه دلیلش ساختاری بود و نه سلیقه‌ای:
 *
 *   ۱. **به ستونِ محتوا تراز نبود.** `<main>` در `layout.tsx`
 *      `mx-auto max-w-[90rem]` دارد؛ این نوار نداشت. یعنی روی هر نمایشگرِ
 *      پهن‌تر از ۱۴۴۰ پیکسل، دکمه‌های نوار چند ده پیکسل بیرون‌تر از لبهٔ
 *      کارت‌های زیرشان می‌نشستند — و چشم همین ناترازی را «به جایی وصل
 *      نیست» می‌خواند. حالا همان `mx-auto`، همان `max-w` و همان
 *      padding ها را دارد، پس لبه‌هایش دقیقاً روی لبهٔ محتوا می‌افتد.
 *
 *   ۲. **۸۲ پیکسل ارتفاع برای یک برچسبِ ۱۳ پیکسلی.** بیشترِ نوار فضای
 *      خالی بود. ۶۴ پیکسل (و ۵۶ روی موبایل) هم به هدفِ لمسیِ ۴۴ پیکسل
 *      می‌رسد و هم نوار را از «سطحِ سفیدِ بزرگ» به «نوارِ ابزار» تبدیل
 *      می‌کند.
 *
 *   ۳. **در هر دو حالتِ اسکرول یک شکل بود.** نوارِ چسبانی که زیرش محتوا رد
 *      می‌شود باید *نشان بدهد* که یک لایهٔ بالاتر است. تا وقتی صفحه بالاست
 *      نوار کاملاً بی‌رنگ است و هیچ مرزی ندارد (هیچ چیزی زیرش نیست که از آن
 *      جدا شود)؛ به محضِ اسکرول، مرز و سایهٔ کوتاهش می‌آید.
 *
 * ⚠️ شنوندهٔ اسکرول `passive` است و فقط یک بولین را عوض می‌کند — نه
 * `setState` در هر پیکسل. بدونِ شرطِ `!==`، هر رویدادِ اسکرول یک رندرِ
 * دوباره بود.
 */
export default function PanelTopbar() {
  const pathname = usePathname();
  const { mobileNavOpen, setMobileNavOpen } = usePanelUi();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const next = window.scrollY > 4;
      setScrolled((prev) => (prev === next ? prev : next));
    };
    onScroll(); // ⚠️ بازگشت به صفحه‌ای که از قبل اسکرول شده هم باید درست باشد.
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-scrolled={scrolled || undefined}
      className={`sticky top-0 z-40 shrink-0 ${styles.topbar}`}
    >
      <div
        className={`mx-auto flex h-full w-full max-w-[90rem] items-center gap-3 px-4 sm:px-6 lg:px-8`}
      >
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger
            aria-label="بخش‌های پنل"
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-border/70 text-muted-foreground transition-colors hover:text-foreground lg:hidden"
          >
            <Menu aria-hidden className="size-4.5" />
          </SheetTrigger>
          <SheetContent title="بخش‌های پنل" className="panel-scope p-4">
            <PanelSidebarBody onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 items-center gap-2.5">
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">پنل کاربری</span>
          <ChevronLeft aria-hidden className="hidden size-3 text-muted-foreground sm:block" />
          <span className="truncate text-[13px] font-semibold">{titleOf(pathname)}</span>
        </div>

        {/* ⚠️ کلیدِ تم از هدرِ سایت به اینجا آمد — چون پنل دیگر هدرِ سایت را
            ندارد و بدونِ این، کاربری که تمِ روشن را ترجیح می‌دهد داخلِ پنل
            راهی برای عوض کردنش نداشت. */}
        <div className="ms-auto flex shrink-0 items-center gap-2">
          {/* ⚠️ زنگوله اینجا و نه در سایدبار: سایدبار روی موبایل پشتِ یک
              دکمه پنهان است، و شمارنده‌ای که دیده نمی‌شود کارِ شمارنده را
              نمی‌کند. */}
          <CommandPalette />
          <NotificationBell />
          <Link href="/" className={styles.topAction}>
            <span className="hidden sm:inline">بازگشت به سروا</span>
            <span className="sr-only sm:hidden">بازگشت به سروا</span>
            <ArrowUpLeft aria-hidden className="size-4" />
          </Link>
          <PaletteButton />
          <DarkModeButton />
        </div>
      </div>
    </header>
  );
}
