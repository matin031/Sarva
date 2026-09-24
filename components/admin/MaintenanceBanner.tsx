import Link from "next/link";
import { maintenanceState } from "@/lib/site/maintenance";

/**
 * نوارِ «سایت برای بقیه بسته است».
 *
 * ⚠️ این نوار برای حالتِ **روشن** نوشته شده و نه برای حالتِ خاموش: وقتی
 * خاموش است چیزی رندر نمی‌کند.
 *
 * دلیلِ وجودش یک خرابیِ مشخص است که هیچ لاگی نشانش نمی‌دهد: **یادت برود
 * خاموشش کنی.** مدیر کلید را می‌زند، کارش را می‌کند، و چون خودش سایت را
 * عادی می‌بیند (استثنای مدیر در `proxy.ts`)، هیچ نشانه‌ای ندارد که بقیه
 * هنوز صفحهٔ «برمی‌گردیم» را می‌بینند. تنها راهِ فهمیدنش، پیامِ یک
 * دانش‌آموز است.
 *
 * ⚠️ در پنل مدیریت و نه در خودِ سایت: خواندنِ این تنظیم در `app/layout.tsx`
 * یعنی **هر** صفحهٔ سایت پویا شود و هیچ‌کدام دیگر ایستا تولید نشوند. پنل
 * مدیریت از قبل پویاست، پس هزینه‌اش صفر است — و همان جایی است که مدیر
 * برای خاموش کردنش باید برود.
 */
export default async function MaintenanceBanner() {
  const state = await maintenanceState();
  if (!state.on) return null;

  return (
    <div
      role="status"
      className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
    >
      <strong className="font-bold text-amber-600 dark:text-amber-400">
        سایت در حالت بروزرسانی است.
      </strong>
      <span className="text-muted-foreground">
        بازدیدکننده‌ها صفحهٔ «برمی‌گردیم» را می‌بینند. تو چون مدیری، سایت را عادی می‌بینی.
      </span>
      <Link
        href="/admin/settings"
        className="font-medium text-amber-600 underline underline-offset-4 dark:text-amber-400"
      >
        خاموش کردن
      </Link>
    </div>
  );
}
