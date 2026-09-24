"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Highlighter } from "@/components/home/Highlighter";
import { ShinyButton } from "./kit/ShinyButton";
import styles from "@/components/home/home.module.css";

/** Centered two-line title, one line of supporting copy and paired CTAs.
 *
 *  ⚠️ نه قرصِ «پلتفرم آموزشی سروا» بالای تیتر، نه جملهٔ «به روشی تعاملی،
 *  امروزی و ماندگار». اولی همان چیزی را می‌گفت که لوگوی هدر می‌گوید و دومی
 *  سه صفتِ کلی پشتِ سرِ هم بود — دقیقاً شکلِ متنی که کسی ننوشته. توضیح
 *  حالا فقط می‌گوید اینجا چه هست. */
export default function HeroSection() {
  return (
    <div className={styles.heroContent}>
      <h1 id="home-title">
        <span className={styles.heroLine}>مسیری نو</span>
        <span className={`${styles.heroLine} ${styles.heroAccent}`}>
          برای یادگیری <Highlighter color="var(--gold)">ادبیات پارسی</Highlighter>
        </span>
      </h1>
      <p className={styles.heroDescription}>
        درسنامهٔ فارسی دهم، یازدهم و دوازدهم، امتحان‌های نهایی، وزن شعر و
        بازی‌های ادبی
      </p>
      <div className={styles.heroActions}>
        <ShinyButton asChild className={styles.heroPrimary}>
          <Link href="/doroos">شروع یادگیری <ArrowLeft size={19} aria-hidden="true" /></Link>
        </ShinyButton>
        <Link className={styles.secondaryButton} href="/guide">راهنمای یادگیری</Link>
      </div>
    </div>
  );
}
