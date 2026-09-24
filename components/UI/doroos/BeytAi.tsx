"use client";

import { useEffect, useRef, useState } from "react";
import type { WordRole } from "@/lib/doroos/types";
import { fetchAnalysis } from "@/lib/doroos/use-analysis";
import styles from "./beyt-ai.module.css";

/* ⚠️ همین یک فایل کلِ «هوشواره» را نگه می‌دارد: نشان، قلّابِ بارگذاری، نمای
   در‌حالِ‌کار و پیامِ هشدار. جدا کردنشان یعنی چهار فایل که هیچ‌کدام بیرون از
   این یکی معنا ندارند و هر تغییرِ کوچک هر چهار تا را باز می‌کند. */

/* ── نشانِ جرقه ───────────────────────────────────────────────────────── */

export function AiSpark({ size = 13 }: { size?: number }) {
  return (
    <svg
      className={styles.spark}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
    >
      {/* ستارهٔ چهارپَر با اضلاعِ مقعّر — با دو منحنیِ درجه‌دو ساخته می‌شود،
          چون چهار مثلثِ صاف «جرقه» دیده نمی‌شوند، «ستاره» دیده می‌شوند. */}
      <path
        className={styles.sparkBig}
        d="M9 1.6c.55 3.6 1.4 5.3 5.1 6.1-3.7.8-4.55 2.5-5.1 6.1-.55-3.6-1.4-5.3-5.1-6.1 3.7-.8 4.55-2.5 5.1-6.1Z"
        fill="currentColor"
      />
      <path
        className={styles.sparkSmall}
        d="M16.2 11.4c.3 1.9.75 2.8 2.7 3.2-1.95.4-2.4 1.3-2.7 3.2-.3-1.9-.75-2.8-2.7-3.2 1.95-.4 2.4-1.3 2.7-3.2Z"
        fill="currentColor"
        opacity="0.75"
      />
    </svg>
  );
}

/* ── مرحله‌ها ─────────────────────────────────────────────────────────── */

/**
 * مرحله‌هایی که حینِ ساختن نشان داده می‌شوند — کوتاه و بی‌اصطلاح. نسخهٔ اول
 * «مرزبندیِ واژه‌ها» و «یافتنِ هسته و وابسته» داشت که بیشتر ادا بود تا خبر.
 */
const STAGES = ["خواندن بیت…", "بررسی واژه‌ها…", "پیدا کردن نقش‌ها…"] as const;

const STAGE_MS = 700;

/** کفِ زمانِ نمایشِ حالتِ کار.
 *
 *  ⚠️ بله، این یک تأخیرِ عمدی است. فایلِ تحلیل یک chunk کوچکِ محلی است و در
 *  چند ده میلی‌ثانیه می‌رسد؛ بدونِ کف، دانش‌آموز فقط یک پرشِ محتوا می‌دید و
 *  هیچ‌وقت نمی‌فهمید چیزی تولید شده.
 *
 *  ⚠️ و فقط **بارِ اول**. برگشتن به این نما از حافظه است و بی‌درنگ؛ تکرارِ
 *  یک انتظارِ ساختگی در هر سوییچ، از خودِ انتظار آزاردهنده‌تر است. */
const MIN_BUSY_MS = STAGES.length * STAGE_MS;

/** عمرِ پیامِ «این را ماشین نوشته». ۴ ثانیه برای خواندنِ یک جملهٔ فارسی
 *  کم است و ۱۰ ثانیه یعنی پیام دیگر موقتی نیست. */
const NOTICE_MS = 6500;

type AiSyntax = {
  roles: WordRole[] | null;
  busy: boolean;
  failed: boolean;
  /** سرور گفت اشتراک نداری (۴۰۳) یا نتوانست بررسی کند (۵۰۳). */
  forbidden: false | "forbidden" | "unavailable";
  stage: string;
};

/**
 * نقش‌های دستوریِ تولیدشده با هوش مصنوعی برای یک بیت.
 *
 * ⚠️ فقط وقتی `active` می‌شود بار می‌گیرد. تا وقتی دانش‌آموز این نما را
 * انتخاب نکرده، حتی یک بایت از فایلِ هوشواره دانلود نمی‌شود.
 */
export function useAiSyntax({
  grade,
  lesson,
  n,
  active,
}: {
  grade: string;
  lesson: number;
  n: number;
  active: boolean;
}): AiSyntax {
  const [roles, setRoles] = useState<WordRole[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState<AiSyntax["forbidden"]>(false);
  const [stage, setStage] = useState(0);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const alive = useRef(true);
  /** بارگذاری یک بار اتفاق می‌افتد؛ سوییچ‌های بعدی از حافظه‌اند. */
  const started = useRef(false);

  useEffect(() => {
    /* ⚠️ `alive` اینجا دوباره true می‌شود و نه فقط در مقدارِ اولیه.
       در حالتِ سخت‌گیرانهٔ ری‌اکت (dev) هر افکت یک بار mount → unmount →
       mount می‌شود؛ اگر فقط در cleanup روی false می‌رفت، از دومین mount به
       بعد تا ابد false می‌ماند و هیچ‌کدام از این setState‌ها اجرا نمی‌شد —
       یعنی لودینگ برای همیشه می‌چرخید و هیچ خطایی هم نمی‌داد. */
    alive.current = true;
    return () => {
      alive.current = false;
      timers.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;

    setBusy(true);
    setFailed(false);
    setForbidden(false);
    setStage(0);

    timers.current.forEach(clearTimeout);
    timers.current = STAGES.slice(1).map((_, i) =>
      setTimeout(() => {
        if (alive.current) setStage(i + 1);
      }, (i + 1) * STAGE_MS),
    );

    const at = Date.now();
    /* ⚠️ از سرور و نه با `import()`ِ مستقیمِ فایلِ هوشواره. آن فایل قبلاً یک
       chunkِ عمومی بود که هر کسی بی‌اشتراک دانلودش می‌کرد. */
    void fetchAnalysis(grade, lesson, "ai").then((result) => {
      const rest = Math.max(0, MIN_BUSY_MS - (Date.now() - at));
      timers.current.push(
        setTimeout(() => {
          if (!alive.current) return;
          setBusy(false);
          const syntax = result.status === "ready" ? result.units[n]?.syntax : undefined;
          if (syntax?.length) {
            setRoles(syntax);
            return;
          }
          if (result.status === "forbidden" || result.status === "unavailable") {
            setForbidden(result.status);
          } else {
            setFailed(true);
          }
          /* ⚠️ اجازهٔ تلاشِ دوباره: شاید شبکه یک لحظه قطع بوده. */
          started.current = false;
        }, rest),
      );
    });
  }, [active, grade, lesson, n]);

  return { roles, busy, failed, forbidden, stage: STAGES[stage] };
}

/* ── نمایِ در حالِ کار ────────────────────────────────────────────────── */

/**
 * اسکلتی که جای نمودار می‌نشیند تا نقش‌ها برسند.
 *
 * ⚠️ فقط جای *نمودار* را می‌گیرد و نه کلِ کارت. هوشواره یک نمای دیگرِ
 * «نقش دستوری» است؛ معنی و مفهوم و قلمروها دست‌نخورده می‌مانند و پاک کردنشان
 * برای سه ثانیه، صفحه را بی‌دلیل می‌پراند.
 *
 * ⚠️ `role="status"` + `aria-live`: کسی که با صفحه‌خوان کار می‌کند هیچ‌کدام
 * از این درخشش‌ها را نمی‌بیند و باید *شنیده* شود که کار در جریان است. اسکلت
 * خودش `aria-hidden` می‌ماند — خواندنِ چند نوارِ خالی کمکی نیست.
 */
export function AiThinking({ stage }: { stage: string }) {
  return (
    <div className={`${styles.aiTint} ${styles.thinking}`}>
      <div className={styles.status} role="status" aria-live="polite">
        <AiSpark size={15} />
        <span className={styles.stage}>{stage}</span>
      </div>

      <div className={styles.beam} aria-hidden />

      {/* شکلِ همان نمودار: یک ردیف برچسب، خطوط، و دو مصراعِ وسط‌چین. */}
      <div className={styles.skMap} aria-hidden>
        <div className={styles.skChips}>
          {[62, 48, 76, 40, 58].map((w, i) => (
            <span key={i} className={`${styles.sk} ${styles.skChip}`} style={{ width: w }} />
          ))}
        </div>
        <div className={styles.skWires}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={styles.skWire} style={{ animationDelay: `${i * 90}ms` }} />
          ))}
        </div>
        <div className={styles.skVerse}>
          <span className={styles.sk} style={{ width: "58%" }} />
          <span className={styles.sk} style={{ width: "52%" }} />
        </div>
      </div>
    </div>
  );
}

/* ── هشدارِ «این را ماشین نوشته» ──────────────────────────────────────── */

/**
 * پیامِ کوتاهی که بعد از آمدنِ نقش‌ها چند ثانیه زیرِ نمودار می‌ماند و می‌رود.
 *
 * ⚠️ چرا موقتی و نه همیشگی: دانش‌آموز ممکن است ده بیت را پشت سر هم ببیند؛
 * یک نوارِ هشدارِ ثابت زیرِ هر کدام، بعد از بیتِ سوم دیگر خوانده نمی‌شود —
 * یعنی دقیقاً وقتی که باید کار کند، کار نمی‌کند.
 *
 * ⚠️ ولی خودِ دکمه («هوشواره») و رنگش می‌مانند، پس بعد از رفتنِ پیام هم
 * معلوم است این نما کدام است. پیام یادآوری است، نه تنها نشانه.
 *
 * ⚠️ `role="status"` و نه `alert`: این خبر است، نه خطر. `alert` صفحه‌خوان را
 * وسطِ کار قطع می‌کند.
 */
export function AiNotice() {
  /* ⚠️ محو شدن با CSS انجام می‌شود و نه با state. نسخهٔ اول یک
     `setVisible(true)` در بدنهٔ افکت داشت تا ترنزیشن راه بیفتد؛ آن یک
     رندرِ آبشاری است و ESLint هم درست می‌گوید. حالا انیمیشن از همان اولین
     فریم اجرا می‌شود و جاوااسکریپت فقط در پایان عنصر را برمی‌دارد — تا یک
     قرصِ نامرئی برای همیشه زیرِ نمودار جا نگیرد. */
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGone(true), NOTICE_MS);
    return () => clearTimeout(t);
  }, []);

  if (gone) return null;

  return (
    <div className={`${styles.aiTint} ${styles.notice}`} role="status" aria-live="polite">
      <AiSpark size={12} />
      <span>امکان اشتباه هست! نقش‌ها توسط هوش مصنوعی پیدا شده‌اند.</span>
    </div>
  );
}

export const aiStyles = styles;
