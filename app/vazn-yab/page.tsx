import VaznYabSection from "@/components/UI/guide/VaznYabSection";
import VaznYabHero3D from "@/components/UI/vazn-yab/VaznYabHero3D";
import MasterChallenge from "@/components/UI/vazn-yab/MasterChallenge";
import { findMeterLocally } from "@/lib/aruz";
import { findMeterOnGanjoor } from "@/lib/ganjoor";

// وزن‌یابی دو مرحله‌ای:
//   ۱) گنجور — برچسبِ انسانی. برای شعرِ کلاسیکِ ثبت‌شده عملاً بی‌خطا و
//      تقریباً بی‌هزینهٔ CPU (فقط یک درخواستِ شبکه).
//   ۲) موتورِ محلی — برای شعرِ تازه/دست‌نویس که در گنجور نیست. روی مجموعهٔ
//      آزمونِ کنارگذاشته ۷۵.۵٪ دقت و ۱.۹ ثانیه CPU در هر جست‌وجو.
// چون بیشترِ جست‌وجوهای کاربران شعرِ معروف است، این ترتیب هم دقتِ محسوس را
// بالا می‌برد هم بارِ CPU سرور را پایین می‌آورد.
const submitPoemSearch = async (mesra1: string, mesra2?: string) => {
  "use server";
  const fromGanjoor = await findMeterOnGanjoor(mesra1, mesra2);
  if (fromGanjoor) return fromGanjoor;
  return findMeterLocally(mesra1, mesra2)?.rhythm;
};

function page() {
  return (
    <div dir="rtl" className="container relative z-20">
      {/* the old flat hero is still at components/UI/HeroSectionVaznYab.tsx —
          swapping these two lines back reverts the redesign */}
      <VaznYabHero3D />

      <MasterChallenge />

      <VaznYabSection submitPoemSearch={submitPoemSearch} />
    </div>
  );
}

export default page;
