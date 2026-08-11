import { redirect } from "next/navigation";

/**
 * `/panel` → `/panel/home`
 *
 * ⚠️ این صفحه اضافه نیست، حتی حالا که ورود و ثبت‌نام مستقیم به `/panel/home`
 * می‌روند. `/panel` هنوز از چند جای دیگر صدا زده می‌شود — منوی هدر
 * (`components/UI/Header.tsx`)، فهرست ناوبری سایت (`lib/site-nav.ts`)، صفحهٔ
 * راهنما، و هر بوکمارکی که کاربر از قبل ساخته. بدون این ریدایرکت همهٔ آن‌ها
 * دوباره ۴۰۴ می‌شوند — دقیقاً همان باگی که قبلاً هر کاربری بعد از ورود موفق
 * می‌دید.
 */
export default function Page() {
  redirect("/panel/home");
}
