import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listDevices } from "@/lib/auth/devices";
import AccountSettings from "@/components/UI/AccountSettings";
import EmailVerification from "@/components/UI/panel/EmailVerification";
import ActiveDevices from "@/components/UI/panel/ActiveDevices";
import PanelPageHeader from "@/components/UI/panel/PanelPageHeader";
import PlusSettingCard from "@/components/UI/panel/PlusSettingCard";

/**
 * حساب کاربری: نام، رمز، ایمیل، و دستگاه‌هایی که وارد شده‌اند.
 *
 * ⚠️ دکمهٔ «خروج از حساب» از انتهای این صفحه برداشته شد و به منوی کاربر در
 * پایینِ سایدبار رفت. کاربری که می‌خواهد خارج شود، نباید اول به صفحهٔ
 * تنظیمات برود و تا ته اسکرول کند — و صفحهٔ تنظیمات هم نباید با یک دکمهٔ
 * قرمزِ بزرگ تمام شود.
 *
 * ⚠️ و «سروا پلاس» بالای فرم‌ها نشست، نه پایینِ صفحه. کاربری که دنبالِ روشن
 * کردنِ پلاس است اول به تنظیمات می‌آید — تا امروز اینجا هیچ نشانی از پلاس
 * نبود و آن کاربر بن‌بست می‌خورد. وقتی پلاس از پنل مدیریت خاموش باشد، این
 * کارت اصلاً رندر نمی‌شود.
 */
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  const devices = await listDevices(user.id);

  return (
    <>
      <PanelPageHeader title="این گوشه، مخصوص توست" description="نامت، رمزت و دستگاه‌هایت؛ حساب سروا را همان‌طور که دوست داری مرتب کن." eyebrow="تنظیمات حساب" tone="lilac" />

      {/* بالای صفحه، چون تنها موردی است که ممکن است *نیازِ به اقدام* داشته
          باشد؛ وقتی ایمیل تأیید شده باشد، خودش به یک نوارِ آرام تبدیل
          می‌شود. */}
      <EmailVerification />

      <PlusSettingCard />

      <AccountSettings />

      <ActiveDevices initial={devices} />
    </>
  );
}
