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
        <h2 id="why-sarva-title">چرا سروا؟</h2>
      </div>
      <div className={styles.features}>
        <FeaturesCard title="پیگیری پیشرفت" desc="نتیجهٔ تمرین‌ها و امتحان‌هایت در پنل ذخیره می‌شود." icon={<FeaturesSectionIconFirst />} bgColor="bg-lapis-light/20" href="/panel" action="مسیرت را ببین" />
        <FeaturesCard title="یادگیری از طریق بازی" desc="آرایه، نقش دستوری و معنی واژه را با بازی تمرین کن." icon={<FeaturesSectionIconThird />} bgColor="bg-turquoise-light/20" href="/game" action="یک بازی انتخاب کن" />
        <FeaturesCard title="وزن‌یاب" desc="یک مصراع بنویس و وزن و ارکانش را ببین." icon={<FeaturesSectionIconFourth />} bgColor="bg-primary/10" href="/vazn-yab" action="وزن شعر را پیدا کن" />
        <FeaturesCard title="آزمون‌های نهایی گذشته" desc="امتحان‌های نهایی سال‌های قبل را آنلاین جواب بده." icon={<FeaturesSectionIconSecond />} bgColor="bg-lapis-light/20" href="/exam" action="امتحان‌ها را ببین" />
      </div>
    </div>
  );
}
