"use client";

import { useRef } from "react";
import RhythmRing from "./RhythmRing";
import { KIMIA_CONFIG } from "@/lib/kimia/config";
import VerseBack from "./VerseBack";
import type { FootKey, KimiaSolution } from "@/lib/kimia/types";

/**
 * باکس بیت — که خودش ظرف ترکیب هم هست، و حالا دو رو دارد.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ⚠️ چرا شعر و ظرف یکی شدند
 * ═══════════════════════════════════════════════════════════════════════
 * نسخهٔ قبل سه چیز جدا داشت: محفظهٔ شعر بالا، مخزن ترکیب وسط، و
 * پخش‌کنندهٔ ریتم لای آن‌ها. یعنی بازیکن رنگ‌ها را در یک ظرف انتزاعی
 * می‌ریخت که ربطش به بیت فقط «بالای سرش است». حالا رنگ در *خود بیت*
 * ریخته می‌شود: ظرفی که پر می‌شود همان چیزی است که باید وزنش را ساخت.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ⚠️ کارت دو رو — و هفت چیزی که سه‌بعدی را می‌شکنند
 * ═══════════════════════════════════════════════════════════════════════
 * ساختار عمداً سه لایه است و نه دو:
 *
 *     .km-verse-scene   ← `perspective`. جعبهٔ چیدمان (اندازه و حاشیه).
 *       .km-verse-flip  ← `transform-style: preserve-3d`. فقط می‌چرخد.
 *         .km-face-front
 *         .km-face-back
 *       [کلید پخش]      ← بیرون از چرخنده، روی لبهٔ پایین
 *
 * ⚠️ روی `.km-verse-flip` و **همهٔ والدهایش تا `.km-verse-scene`** هیچ
 * `overflow` غیر از `visible`، هیچ `filter`، `contain`، `opacity` کمتر از
 * یک، `mix-blend-mode` یا `clip-path` نباید باشد. هر کدام از این‌ها یک
 * «زمینهٔ چیدمان» می‌سازند که `preserve-3d` را بی‌اثر می‌کند و کارت
 * به‌جای چرخیدن، *تخت* پهن می‌شود. این تنها باگی است که در این فایل
 * می‌تواند بی‌صدا برگردد، چون هیچ خطایی نمی‌دهد و فقط بد به‌نظر می‌رسد.
 *
 * داخل هر وجه آزاد است: `.km-verse-bowl` همچنان `contain: layout paint` و
 * `overflow: hidden` دارد و باید داشته باشد.
 *
 * ⚠️ کلید پخش بیرون از چرخنده است چون نباید بچرخد (روی پشت کارت هم همان
 * ریتم پخش می‌شود) و چون یک دکمهٔ گرد وسطِ یک سطح در حال چرخش، روی
 * سافاری لبه‌هایش را از دست می‌دهد.
 *
 * ⚠️ بردر ریتم اما *دو تا* است، یکی روی هر وجه. یک بردرِ مشترک بیرون از
 * چرخنده، هنگام چرخش روی هوا معلق می‌ماند. هر دو نمونه از یک store
 * می‌خوانند، پس یک `currentTime` دارند.
 *
 * ── و هیچ منطقی منتظر چرخش نمی‌ماند ──────────────────────────────────
 * ⚠️ `flipped` فقط یک کلاس CSS را عوض می‌کند. حالت بازی با پاسخ سرور
 * جلو رفته و «بیت بعدی» از همان لحظه فعال است؛ اگر کاربر وسط چرخش
 * بزندش، کارت بدون انیمیشن به وجه جلو برمی‌گردد.
 *
 * ── چرا خط زمانی مستقیم با DOM کار می‌کند ──────────────────────────────
 * ⚠️ در هر فریم ارتفاع لایه‌ها و جای موج عوض می‌شود. اگر این‌ها state
 * بودند، هر فریم یک رندر React می‌شد — ۶۰ رندر در ثانیه برای چیزی که
 * هیچ ربطی به منطق بازی ندارد. و گره‌ها را خود خط زمانی از DOM پیدا
 * می‌کند و نه از یک `useImperativeHandle`؛ دلیلش در `lib/kimia/scene.ts`.
 */

export type VesselMode = "edit" | "analyzing" | "correct" | "wrong";

const FLIP = KIMIA_CONFIG.motion.flip;

export default function VerseVessel({
  lines,
  loading,
  mode,
  playDisabled,
  demoProgress,
  solution = null,
  yours = [],
  solved = false,
  flipped = false,
}: {
  lines: readonly string[];
  loading: boolean;
  mode: VesselMode;
  /** قفل پخش — وسط ترکیب و داوری. */
  playDisabled?: boolean;
  /** فقط پیش‌نمایش تزئینی صفحهٔ شروع؛ توضیح در `RhythmRing`. */
  demoProgress?: number | null;
  /** پاسخ درست. تا وقتی `null` است، وجه پشت اصلاً ساخته نمی‌شود. */
  solution?: KimiaSolution | null;
  /** چیدمان خود بازیکن در آخرین تلاش. */
  yours?: readonly FootKey[];
  /** خودش ساخت (در برابر: پاسخ نشانش داده شد). */
  solved?: boolean;
  /** کارت چرخیده باشد. فقط دیداری. */
  flipped?: boolean;
}) {
  /* ⚠️ هر وجه ref خودش را دارد: بردر اندازهٔ همان وجه را می‌خواند. این
     refها فقط داخل همین کامپوننت مصرف می‌شوند، پس مسئلهٔ دوبار سوار شدن
     را ندارند. */
  const frontRef = useRef<HTMLElement>(null);
  const backRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  /* چرخش فقط وقتی معنا دارد که چیزی برای نشان دادن باشد. */
  const showBack = Boolean(solution);
  const turned = showBack && flipped;

  return (
    /* ⚠️ `data-mode` هم اینجاست و هم روی وجه جلو. تکراری است و عمدی:
       CSSِ تیکِ «درست» روی کلید پخش می‌نشیند که *بیرون* از کارت است، و
       `lib/kimia/scene.ts` و تست‌های مرورگری از روزِ اول
       `.km-verse-card[data-mode]` را می‌خوانند. برداشتن هرکدام یکی از
       آن دو را می‌شکند. */
    <div
      ref={sceneRef}
      className="km-verse-scene"
      data-mode={mode}
      data-flipped={turned || undefined}
      /* ⚠️ زمان‌ها از `config.ts` می‌آیند و نه از CSS: تأخیر چرخش (که یک
         تایمر در `KimiaGame` است) و طول خودِ چرخش باید کنار هم تنظیم
         شوند، وگرنه یکی بی‌خبر از دیگری عوض می‌شود. */
      style={
        {
          "--km-flip-turn": `${FLIP.turnMs}ms`,
          "--km-flip-reduced": `${FLIP.reducedMs}ms`,
        } as React.CSSProperties
      }
    >
      <div className="km-verse-flip">
        <section
          ref={frontRef}
          className="km-verse-card km-face km-face-front"
          data-mode={mode}
          aria-label="بیت این دور"
          /* ⚠️ وجه پنهان هم از دسترس صفحه‌خوان و هم از مسیر Tab بیرون
             می‌رود، هم‌زمان با *شروع* چرخش و نه با پایانش. */
          aria-hidden={turned || undefined}
          inert={turned || undefined}
        >
          <div className="km-verse-bowl" aria-hidden>
            <div className="km-verse-bands" />
            <div className="km-verse-wave">
              <svg viewBox="0 0 400 18" preserveAspectRatio="none" aria-hidden focusable="false">
                <path d="M0 9 Q25 1 50 9 T100 9 T150 9 T200 9 T250 9 T300 9 T350 9 T400 9 V18 H0Z" />
              </svg>
            </div>
          </div>

          <div className="km-verse-body">
            {loading || lines.length === 0 ? (
              <>
                <span className="km-verse-skeleton" aria-hidden />
                <span className="km-verse-skeleton km-verse-skeleton-b" aria-hidden />
                <span className="sr-only">بیت در راه است…</span>
              </>
            ) : (
              lines.map((line, i) => (
                <p key={i} className="km-verse-line game-verse">
                  {line}
                </p>
              ))
            )}
          </div>

          <RhythmRing vesselRef={frontRef} ringOnly />
        </section>

        {showBack && solution ? (
          <section
            ref={backRef}
            className="km-verse-card km-face km-face-back"
            aria-label="پاسخ این بیت"
            aria-hidden={!turned || undefined}
            inert={!turned || undefined}
          >
            <VerseBack lines={lines} solution={solution} yours={yours} solved={solved} />
            <RhythmRing vesselRef={backRef} ringOnly />
          </section>
        ) : null}
      </div>

      {/* بیرون از چرخنده. تیک «درست» را CSS از روی `data-mode` صحنه
          می‌کشد، پس پخش‌کننده لازم نیست حالت داوری را بداند. */}
      <RhythmRing vesselRef={sceneRef} disabled={playDisabled} demoProgress={demoProgress} buttonOnly />
    </div>
  );
}
