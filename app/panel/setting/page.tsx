import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listDevices } from "@/lib/auth/devices";
import AccountSettings from "@/components/UI/AccountSettings";
import ProfileForm from "@/components/UI/panel/ProfileForm";
import PhoneVerification from "@/components/UI/panel/PhoneVerification";
import EmailVerification from "@/components/UI/panel/EmailVerification";
import ActiveDevices from "@/components/UI/panel/ActiveDevices";
import PanelPageHeader from "@/components/UI/panel/PanelPageHeader";
import PlusSettingCard from "@/components/UI/panel/PlusSettingCard";
import NotificationPreferences from "@/components/UI/panel/NotificationPreferences";
import { getNotifyPreferences } from "@/lib/notify/preferences";

/**
 * حساب کاربری: پروفایل، رمز، ایمیل، موبایل، و دستگاه‌هایی که وارد شده‌اند.
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
  const notifyPrefs = await getNotifyPreferences(user.id);

  return (
    <>
      <PanelPageHeader title="تنظیمات حساب" description="نام، رمز، ایمیل، شمارهٔ موبایل و دستگاه‌هایی که با آن‌ها وارد شده‌ای." tone="lilac" />

      {/* بالای صفحه، چون تنها موردی است که ممکن است *نیازِ به اقدام* داشته
          باشد؛ وقتی ایمیل تأیید شده باشد، خودش به یک نوارِ آرام تبدیل
          می‌شود. */}
      <EmailVerification />

      {/* ⚠️ تأیید شماره کنارِ تأیید ایمیل و نه جای دیگری: هر دو یک کار
          می‌کنند و کاربری که دنبالِ «چطور شماره‌ام را اضافه کنم» است، اول
          همین بالا را نگاه می‌کند. و بند ۵ به این ستون تکیه دارد — بدونِ
          شمارهٔ تأییدشده، درخواستِ دبیری ثبت نمی‌شود. */}
      <PhoneVerification />

      <PlusSettingCard />

      {/* ⚠️ بند ۱: اطلاعاتِ تکمیلی *اینجا* گرفته می‌شود و نه در ثبت‌نام.
          این فرم جای کارتِ «تغییر نام» را در `AccountSettings` گرفت؛ دو
          فرم که هر دو نام را می‌نویسند، یعنی کاربر نمی‌داند کدام برنده
          است. */}
      <ProfileForm />

      {/* ⚠️ زیرِ فرمِ پروفایل و بالای «امنیت»: این یک تنظیمِ ارتباطی است و
          کنارِ ایمیل و موبایل معنی می‌دهد، نه کنارِ رمز و دستگاه‌ها. */}
      <NotificationPreferences initial={notifyPrefs} />

      <AccountSettings />

      <ActiveDevices initial={devices} />
    </>
  );
}
