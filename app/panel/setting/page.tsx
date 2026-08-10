import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listDevices } from "@/lib/auth/devices";
import AccountSettings from "@/components/UI/AccountSettings";
import ExitPanelBtn from "@/components/UI/ExitPanelBtn";
import EmailVerification from "@/components/UI/panel/EmailVerification";
import ActiveDevices from "@/components/UI/panel/ActiveDevices";

/**
 * حساب کاربری.
 *
 * تا امروز فقط «تغییر نام» و «تغییر رمز» بود. دو چیزی که کنارشان اضافه شده،
 * هر دو قابلیت‌هایی بودند که سمت سرور کامل آماده بودند و فقط رابط نداشتند:
 *
 *   • تأیید ایمیل — کاربری که صفحهٔ کد را در ثبت‌نام رد می‌کرد، تا ابد
 *     «تأییدنشده» می‌ماند و راهی برای درستش نداشت.
 *   • دستگاه‌های وارد شده — `listActiveSessions` از ابتدا نوشته شده بود و
 *     هیچ‌جا صدا زده نمی‌شد.
 */
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  const devices = await listDevices(user.id);

  return (
    <div className="relative z-20 flex flex-col gap-6">
      <div>
        <span
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30
           bg-primary/10 px-4 py-1 text-sm font-semibold text-primary"
        >
          حساب کاربری
        </span>
        <h1 className="text-xl font-bold">تنظیمات حساب</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          نام، رمز عبور، ایمیل و دستگاه‌هایی که با حسابت وارد شده‌اند.
        </p>
      </div>

      {/* بالای صفحه چون تنها موردی است که ممکن است نیاز به اقدام داشته باشد؛
          وقتی ایمیل تأیید شده باشد، به یک نوار آرام تبدیل می‌شود. */}
      <EmailVerification />

      <AccountSettings />

      <ActiveDevices initial={devices} />

      <ExitPanelBtn />
    </div>
  );
}
