"use client";

import FootGlyph from "./FootGlyph";
import { footVisual } from "@/lib/kimia/visuals";
import { KIMIA_COPY } from "@/lib/kimia/copy";
import type { FootKey } from "@/lib/kimia/types";

/**
 * نوارِ وزن — ارکانِ یک بیت به‌صورتِ یک روبانِ پیوسته.
 *
 * هر رکن یک بخش از روبان است، به رنگِ جوهرِ خودش (همان رنگِ شیشه‌اش در رَک)،
 * با نشانه‌های هجا که به‌صورتِ شکل کشیده می‌شوند (`FootGlyph`) و نه با
 * کاراکترِ «–∪». نامِ رکن زیرِ بخشِ خودش می‌نشیند.
 *
 * ⚠️ پهنای هر بخش با `flex-grow` برابرِ تعدادِ هجاهاست: روبان همیشه کلِ پهنا
 * را پر می‌کند و رکنِ بلندتر واقعاً بلندتر دیده می‌شود.
 *
 * ⚠️ نشانهٔ «غلط» (در ردیفِ «چیدمان تو») هاشور و یک ضربدر است و نه فقط
 * رنگ: بخش‌ها خودشان رنگی‌اند و قرمزِ اضافه برای کوررنگ‌ها چیزی نمی‌گفت.
 */
export default function RhythmBar({
  feet,
  wrongAt,
  dim = false,
  label,
}: {
  feet: readonly FootKey[];
  wrongAt?: ReadonlySet<number>;
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
        /* از شش رکن به بالا، روی گوشی دو ردیف می‌شود. */
        data-many={feet.length >= 6 ? "" : undefined}
        aria-label={label ?? KIMIA_COPY.back.barLabel}
      >
        {feet.map((foot, i) => {
          const v = footVisual(foot);
          const beats = Math.max(1, v.pattern.length);
          return (
            <li
              key={`${foot}-${i}`}
              className="km-rblock"
              data-wrong={wrongAt?.has(i) ? "" : undefined}
              style={{ "--km-ink": v.color, "--j": i, flexGrow: beats } as React.CSSProperties}
            >
              <span className="km-rblock-fill">
                <FootGlyph pattern={v.pattern} className="km-rblock-glyph" />
                <span className="km-rblock-name">{foot}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
