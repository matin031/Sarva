import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";
import VaznYabSection from "@/components/UI/guide/VaznYabSection";
import VaznYabHero3D from "@/components/UI/vazn-yab/VaznYabHero3D";
import MasterChallenge from "@/components/UI/vazn-yab/MasterChallenge";

// وزن‌یابی کاملاً در مرورگر انجام می‌شود (نگاه کنید به VaznYabSection).
//
// پیش‌تر اول گنجور پرسیده می‌شد و بعد موتور. آن مرحله برداشته شد چون هرگز در
// عمل آزمایش نشد — در محیطِ توسعه به api.ganjoor.net دسترسی نبود و راهی نبود
// که مطمئن شویم واقعاً کار می‌کند. مسیرِ آزمایش‌نشده در مسیرِ اصلیِ کاربر
// بدهی است، نه سرمایه.
//
// نتیجه: این صفحه هیچ server action ندارد و کاملاً ثابت است. سهمِ CPU و
// حافظهٔ سرور برای وزن‌یابی صفر است.
//
// برای برگرداندنِ گنجور: lib/ganjoor.ts دست‌نخورده مانده. یک server action
// بسازید که findMeterOnGanjoor را صدا بزند و در VaznYabSection پیش از
// موتورِ محلی امتحانش کنید. آن‌جا برچسبِ انسانی می‌دهد که از ۸۴.۵٪ موتور
// دقیق‌تر است — ولی فقط اگر واقعاً کار کردنش را دیده باشید.
/**
 * ⚠️ این صفحه هم مثل /aruz هیچ متادیتایی نداشت: عنوانِ خانه را می‌گرفت و
 * `canonical: "/"` را ارث می‌برد، یعنی خودش را تکراریِ خانه اعلام می‌کرد.
 *
 * توضیح عمداً محدودیت را هم می‌گوید. وزن‌یابی اینجا با موتورِ محلی انجام
 * می‌شود و همان‌طور که در یادداشتِ بالا آمده، خطا دارد. توصیفی که این را
 * پنهان کند، کاربری می‌آورد که انتظارِ دقتِ کامل دارد و ناامید می‌رود.
 */
export const metadata: Metadata = pageMetadata({
  path: "/vazn-yab",
  title: "وزن‌یاب — تشخیص وزن شعر فارسی",
  description:
    "یک مصرع را بنویسید تا وزن عروضی و تقطیع آن را ببینید. وزن‌یاب در مرورگر شما اجرا می‌شود، نمونه و راهنمای خواندنِ نتیجه دارد، و مواردی که تشخیصش قطعی نیست را صریح می‌گوید.",
});

function page() {
  return (
    <div dir="rtl" className="container relative z-20">
      {/* the old flat hero is still at components/UI/HeroSectionVaznYab.tsx —
          swapping these two lines back reverts the redesign */}
      <VaznYabHero3D />

      <MasterChallenge />

      <VaznYabSection />
    </div>
  );
}

export default page;
