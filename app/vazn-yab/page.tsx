import VaznYabSection from "@/components/UI/guide/VaznYabSection";
import VaznYabHero3D from "@/components/UI/vazn-yab/VaznYabHero3D";
import MasterChallenge from "@/components/UI/vazn-yab/MasterChallenge";
import { findMeterOnGanjoor } from "@/lib/ganjoor";

// وزن‌یابی دو مرحله‌ای، و هر مرحله جایی اجرا می‌شود که ارزان باشد:
//
//   ۱) گنجور — روی سرور. برچسبِ انسانی، پس برای شعرِ کلاسیکِ ثبت‌شده عملاً
//      بی‌خطاست. یک درخواستِ شبکه است و CPU نمی‌خواهد. روی سرور می‌ماند چون
//      فراخوانی از مرورگر به CORS می‌خورد.
//
//   ۲) موتورِ محلی — *در مرورگر* (نگاه کنید به VaznYabSection). اندازه‌گیری
//      شد: هر جست‌وجو ۵۳۹ میلی‌ثانیه CPU و ~۱۷۶ مگابایت حافظه می‌خواهد، یعنی
//      هر هستهٔ سرور فقط ~۲ درخواست در ثانیه. موتور محاسبهٔ خالص است و هیچ
//      وابستگیِ سروری ندارد، پس اجرا در دستگاهِ کاربر سهمِ سرور را صفر می‌کند
//      و دقت دقیقاً همان می‌ماند — همان کد و همان وزن‌ها، فقط جای اجرا.
const lookupOnGanjoor = async (mesra1: string, mesra2?: string) => {
  "use server";
  return findMeterOnGanjoor(mesra1, mesra2);
};

function page() {
  return (
    <div dir="rtl" className="container relative z-20">
      {/* the old flat hero is still at components/UI/HeroSectionVaznYab.tsx —
          swapping these two lines back reverts the redesign */}
      <VaznYabHero3D />

      <MasterChallenge />

      <VaznYabSection lookupOnGanjoor={lookupOnGanjoor} />
    </div>
  );
}

export default page;
