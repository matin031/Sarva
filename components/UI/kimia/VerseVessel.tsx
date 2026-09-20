"use client";

import { useRef } from "react";
import RhythmRing from "./RhythmRing";

/**
 * باکسِ بیت — که خودش ظرفِ ترکیب هم هست.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ⚠️ چرا شعر و ظرف یکی شدند
 * ═══════════════════════════════════════════════════════════════════════
 * نسخهٔ قبل سه چیزِ جدا داشت: محفظهٔ شعر بالا، مخزنِ ترکیب وسط، و
 * پخش‌کنندهٔ ریتم لای آن‌ها. یعنی بازیکن رنگ‌ها را در یک ظرفِ انتزاعی
 * می‌ریخت که ربطش به بیت فقط «بالای سرش است». حالا رنگ در *خودِ بیت*
 * ریخته می‌شود: ظرفی که پر می‌شود همان چیزی است که باید وزنش را ساخت.
 *
 * ── لایه‌های رنگ ────────────────────────────────────────────────────────
 * ⚠️ لایه‌ها با `scaleY` *تنها* ساخته نمی‌شوند. یک ستونِ flex از عنصرهایی
 * که فقط مقیاس می‌گیرند، چیدمانش را حفظ نمی‌کند: هر لایه بعد از مقیاس،
 * همان فضای اولیه‌اش را اشغال می‌کند و بقیه جابه‌جا می‌شوند. اینجا هر
 * لایه **مطلق** است و با `translateY(-cum) scaleY(k)` هم بالا می‌رود و
 * هم بلند می‌شود — یعنی چیدمانی وجود ندارد که بشکند، و هیچ فریمی layout
 * نمی‌سازد (`contain: layout paint` هم روی ظرف هست).
 *
 * ترتیبِ تبدیل‌ها عمدی است: `scaleY` اول روی خودِ لایه اعمال می‌شود
 * (لنگر در کف)، و `translateY` بعد از آن در فضای والد — پس جابه‌جایی
 * *مقیاس نمی‌خورد* و انباشتِ لایه‌ها دقیق می‌ماند.
 *
 * ── چرا خطِ زمانی مستقیم با DOM کار می‌کند ──────────────────────────────
 * ⚠️ در هر فریم ارتفاعِ لایه‌ها و جای موج عوض می‌شود. اگر این‌ها state
 * بودند، هر فریم یک رندرِ React می‌شد — ۶۰ رندر در ثانیه برای چیزی که
 * هیچ ربطی به منطقِ بازی ندارد.
 *
 * ⚠️ و گره‌ها را خودِ خطِ زمانی از DOM پیدا می‌کند و نه از یک
 * `useImperativeHandle`. دلیلش یک باگِ واقعی است: در حالتِ توسعه React
 * کامپوننت را دوبار سوار می‌کند و `ref.current` می‌تواند روی handleِ
 * نمونهٔ *مرده* بماند. یک بار همین اتفاق برای پخش‌کننده‌ها افتاد و
 * پروازِ شیشه‌ها بی‌صدا از کار افتاد. کلاسِ باگ با پرسیدن از خودِ صفحه
 * حذف می‌شود؛ `lib/kimia/scene.ts` تنها جایی است که این نام‌ها را
 * می‌شناسد.
 */

export type VesselMode = "edit" | "analyzing" | "correct" | "wrong";

export default function VerseVessel({
  lines,
  loading,
  mode,
  playDisabled,
  demoProgress,
}: {
  lines: readonly string[];
  loading: boolean;
  mode: VesselMode;
  /** قفلِ پخش — وسطِ ترکیب و داوری. */
  playDisabled?: boolean;
  /** فقط پیش‌نمایشِ تزئینیِ صفحهٔ شروع؛ توضیح در `RhythmRing`. */
  demoProgress?: number | null;
}) {
  /* ⚠️ این ref فقط داخلِ خودِ همین کامپوننت مصرف می‌شود (حلقهٔ ریتم
     شعاعِ گوشه را از آن می‌خوانَد)، پس مسئلهٔ دوبار سوار شدن را ندارد. */
  const rootRef = useRef<HTMLElement>(null);

  return (
    <section ref={rootRef} className="km-verse-card" data-mode={mode} aria-label="بیتِ این دور">
      {/* محتویاتِ ظرف: لایه‌های رنگ و سطحِ مایع. */}
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
            <span className="sr-only">در حالِ آوردنِ بیت…</span>
          </>
        ) : (
          lines.map((line, i) => (
            <p key={i} className="km-verse-line game-verse">
              {line}
            </p>
          ))
        )}
      </div>

      {/* تیکِ «درست» را CSS از روی `data-mode`ِ همین کارت می‌کشد، پس
          پخش‌کننده لازم نیست حالتِ داوری را بداند. */}
      <RhythmRing vesselRef={rootRef} disabled={playDisabled} demoProgress={demoProgress} />
    </section>
  );
}
