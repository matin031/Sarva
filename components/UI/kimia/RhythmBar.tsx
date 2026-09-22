"use client";

import { footVisual } from "@/lib/kimia/visuals";
import { KIMIA_COPY } from "@/lib/kimia/copy";
import type { FootKey } from "@/lib/kimia/types";

/**
 * نوار ارکان — همان چیزی که پشت کارت، پاسخ را *نشان* می‌دهد.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ⚠️ چرا نوار و نه یک خط متن
 * ═══════════════════════════════════════════════════════════════════════
 * «فاعلاتن فاعلاتن فاعلن» به‌شکل متن، همان چیزی است که بازیکن تازه در آن
 * شکست خورده. چیزی که نمی‌داند *ریتم* است، و ریتم طول دارد: مفاعیلن چهار
 * هجاست و فعولن سه. پس عرض هر بلوک به تعداد هجاهایش است و نه به طول
 * نامش — یعنی نوار، خودش الگوی وزن را می‌کشد.
 *
 * ⚠️ رنگ‌ها از `lib/kimia/visuals.ts` می‌آیند و نه از اینجا: همان رنگی که
 * روی ویال و در جایگاه رک دیده، اینجا هم همان است. زنجیرهٔ حافظه
 * (رکن → رنگ → نشانه → صدا) با یک رنگ دوم پاره می‌شود.
 *
 * ⚠️ و `–` و `∪` داخل خود بلوک نوشته می‌شوند. این تزئین نیست: تنها چیزی
 * است که می‌گوید *چرا* این رکن اینجا می‌نشیند.
 *
 * ── دو ردیف، و نه دو معنا ────────────────────────────────────────────────
 * وقتی بازیکن خودش درست چیده، فقط یک ردیف هست: چیدمان خودش. وقتی پاسخ
 * نشان داده شده، ردیف بالا پاسخ درست است و ردیف پایین چیدمان او — با
 * شفافیت کمتر و یک **خط زیر** بلوک‌های غلط.
 *
 * ⚠️ خط و نه رنگ: بلوک‌ها از قبل رنگی‌اند و یک قرمزِ اضافه روی یک بلوکِ
 * فیروزه‌ای، هم بدنما بود و هم برای کسی که رنگ را نمی‌بیند هیچ نمی‌گفت.
 */
export default function RhythmBar({
  feet,
  wrongAt,
  dim = false,
  label,
}: {
  feet: readonly FootKey[];
  /** اندیس‌هایی که با پاسخ درست نمی‌خوانند. فقط در حالت نمایش پاسخ. */
  wrongAt?: ReadonlySet<number>;
  /** ردیف ثانویه: چیدمان بازیکن یا خوانش دیگر. */
  dim?: boolean;
  label?: string;
}) {
  return (
    <div className="km-bar-row" data-dim={dim || undefined}>
      {label ? (
        <span className="km-bar-rowlabel" aria-hidden>
          {label}
        </span>
      ) : null}
      <ol
        className="km-rbar"
        /* ⚠️ `data-many`: با شش رکن به بالا، روی گوشی نوار به دو ردیف
           می‌شکند. زیر آن حد شکستن، فقط فاصله‌ها را خراب می‌کند. */
        data-many={feet.length >= 6 ? "" : undefined}
        aria-label={label ?? KIMIA_COPY.back.barLabel}
      >
        {feet.map((foot, i) => {
          const v = footVisual(foot);
          /* عرض به تعداد هجاها. `flex-grow` و نه عرض ثابت، تا نوار همیشه
             کل پهنا را پر کند و در هیچ اندازه‌ای ته آن خالی نماند. */
          const beats = Math.max(1, v.pattern.length);
          return (
            <li
              key={`${foot}-${i}`}
              className="km-rblock"
              data-wrong={wrongAt?.has(i) ? "" : undefined}
              style={{ "--km-ink": v.color, flexGrow: beats } as React.CSSProperties}
            >
              <span className="km-rblock-sig" aria-hidden>
                {v.pattern.split("").map((c, j) => (
                  <span key={j} className="km-rsyl" data-long={c === "-" ? "" : undefined}>
                    {c === "-" ? "–" : "∪"}
                  </span>
                ))}
              </span>
              <span className="km-rblock-name">{foot}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
