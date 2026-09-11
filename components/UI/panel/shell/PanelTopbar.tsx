"use client";

import { usePathname } from "next/navigation";
import { Menu, ArrowUpLeft, ChevronLeft } from "lucide-react";
import Link from "next/link";
import DarkModeButton from "@/components/UI/DarkModeButton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/UI/kit/sheet";
import { usePanelUi } from "@/lib/panel/ui-store";
import { titleOf } from "./nav";
import { PanelSidebarBody } from "./PanelSidebar";
import styles from "../panel-design.module.css";

/**
 * نوارِ بالای پنل — **یک** نوار.
 *
 * ⚠️ در طرحِ اول این دو نوار بود: یکی برای مسیرِ صفحه و یکی برای جست‌وجو.
 * برای پنلی که ده صفحهٔ هم‌سطح دارد و هیچ‌کدام تودرتو نیستند، مسیرِ
 * چندمرحله‌ای اطلاعاتی اضافه نمی‌کرد؛ نامِ صفحه کافی است و بقیهٔ نوار به
 * کارهای واقعی می‌رسد.
 */
export default function PanelTopbar() {
  const pathname = usePathname();
  const { mobileNavOpen, setMobileNavOpen } = usePanelUi();

  return (
    <header className={`sticky top-0 z-40 flex shrink-0 items-center gap-3 px-4 backdrop-blur-md sm:px-6 lg:px-8 ${styles.topbar}`}>
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
        <Link href="/" className={styles.topAction}>
          <span className="hidden sm:inline">بازگشت به سروا</span>
          <span className="sr-only sm:hidden">بازگشت به سروا</span>
          <ArrowUpLeft aria-hidden className="size-4" />
        </Link>
        <DarkModeButton />
      </div>
    </header>
  );
}
