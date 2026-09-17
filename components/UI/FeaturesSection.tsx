import FeaturesSectionIconFirst from "../svgs/FeaturesSectionIconFirst";
import FeaturesSectionIconSecond from "../svgs/FeaturesSectionIconSecond";
import FeaturesSectionIconThird from "../svgs/FeaturesSectionIconThird";
import FeaturesSectionIconFourth from "../svgs/FeaturesSectionIconFourth";
import FeaturesCard from "./FeaturesCard";
import styles from "@/components/home/home.module.css";

/** Existing Why Sarva content and illustrations from a00311c. */
export default function FeaturesSection() {
  return (
    <div>
      <div className={styles.whyHeading}>
        <span className={styles.kicker}>یادگیری به روش سروا</span>
        <h2 id="why-sarva-title">چرا سروا؟</h2>
        <p>از بازی و وزن‌یابی تا آزمون‌های نهایی و آموزش گام‌به‌گام؛ ابزارهای متنوع برای یادگیری ادبیات فارسی، یک‌جا.</p>
      </div>
      <div className={styles.features}>
        <FeaturesCard title="پیگیری پیشرفت" desc="روندِ پیشرفتت را دنبال کن و پله‌پله به سطوح بالاتر برس" icon={<FeaturesSectionIconFirst />} bgColor="bg-lapis-light/20" href="/panel" action="مسیرت را ببین" />
        <FeaturesCard title="یادگیری از طریق بازی" desc="مفاهیم ادبی را با بازی و تمرین تعاملی یاد بگیر و در ذهن ماندگار کن" icon={<FeaturesSectionIconThird />} bgColor="bg-gold/20" href="/game" action="یک بازی انتخاب کن" />
        <FeaturesCard title="وزن‌یاب هوشمند" desc="مصراعی را وارد کن و وزن عروضی‌اش را در لحظه بررسی کن" icon={<FeaturesSectionIconFourth />} bgColor="bg-primary/10" href="/vazn-yab" action="وزن شعر را پیدا کن" />
        <FeaturesCard title="آزمون‌های نهایی گذشته" desc="امتحانات نهایی سال‌های قبل را به‌صورت آنلاین و مدرن تمرین کن" icon={<FeaturesSectionIconSecond />} bgColor="bg-turquoise-light/20" href="/exam" action="امتحان‌ها را ببین" />
      </div>
    </div>
  );
}
