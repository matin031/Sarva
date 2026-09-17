"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Highlighter } from "@/components/home/Highlighter";
import { ShinyButton } from "./kit/ShinyButton";
import styles from "@/components/home/home.module.css";

/** Restored from a00311c: centered badge, two-line title, original supporting
 * copy and paired CTAs. Only typography spacing, highlight and CTA are refined. */
export default function HeroSection() {
  return (
    <div className={styles.heroContent}>
      <span className={styles.eyebrow}>پلتفرم آموزشی سروا</span>
      <h1 id="home-title">
        <span className={styles.heroLine}>مسیری نو</span>
        <span className={`${styles.heroLine} ${styles.heroAccent}`}>
          برای یادگیری <Highlighter color="var(--gold)">ادبیات پارسی</Highlighter>
        </span>
      </h1>
      <p className={styles.heroDescription}>
        از آهنگ و وزن شعر تا دستور زبان، آرایه‌های ادبی و مفاهیم؛ همراه با
        درس‌به‌درس کتاب فارسی دهم، یازدهم و دوازدهم — به روشی تعاملی، امروزی و
        ماندگار
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
