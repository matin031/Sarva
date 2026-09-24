"use client";

import { useSyncExternalStore } from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Check } from "lucide-react";
import {
  applyReadingFont,
  DEFAULT_READING_FONT,
  READING_FONTS,
  READING_FONT_SAMPLE,
  readReadingFont,
  subscribeToReadingFont,
  type ReadingFontId,
} from "@/lib/theme/reading-font";
import styles from "./reading-font-dock.module.css";

/**
 * انتخابِ قلمِ درسنامه — یک داکِ شناور در گوشهٔ پایینِ صفحهٔ درس.
 *
 * برادرِ `components/UI/PaletteButton.tsx` است و عمداً همان ساختار را
 * دارد: منبعِ حقیقت اتریبیوتِ روی <html> است، نه یک `useState`. اگر یک
 * کپیِ ری‌اکتی نگه می‌داشتیم، دو منبعِ حقیقت داشتیم که می‌توانند از هم جدا
 * بیفتند (مثلاً اگر جای دیگری `applyReadingFont` صدا زده شود، یا کاربر در
 * تبِ دیگری قلم را عوض کند).
 *
 * ⚠️ آرگومانِ سومِ `useSyncExternalStore` همان پیش‌فرضی است که سرور در HTML
 * می‌نویسد. بدونِ آن، رندرِ سرور به DOM دست می‌زد و می‌ترکید.
 *
 * ⚠️ این کامپوننت پیش از mount چیزی را پنهان نمی‌کند و `null` برنمی‌گرداند.
 * همان درسِ PaletteButton: برگرداندنِ null فقط یک پرشِ دیدنی می‌سازد، و
 * تنها چیزی که واقعاً به کلاینت نیاز دارد این است که *کدام* گزینه تیک
 * بخورد — که با اسکریپتِ درون‌خطیِ layout پیش از اولین چیدمان روی <html>
 * نشسته و در همان رندرِ اول درست است.
 */
export default function ReadingFontDock() {
  const current = useSyncExternalStore(
    subscribeToReadingFont,
    readReadingFont,
    () => DEFAULT_READING_FONT,
  );

  const active =
    READING_FONTS.find((font) => font.id === current) ?? READING_FONTS[0];

  return (
    <div className={styles.dock}>
      <Menu.Root dir="rtl" modal={false}>
        <Menu.Trigger className={styles.trigger} aria-label="تغییر فونت">
          {/* ⚠️ `aria-hidden` روی «آ»: این یک نمونهٔ دیداری است، نه متن.
              صفحه‌خوان باید همان برچسبِ دکمه را بخواند و نه «آ قلم پیدا». */}
          <span
            className={styles.triggerGlyph}
            style={{ fontFamily: active.stack }}
            aria-hidden
          >
            آ
          </span>
          <span className={styles.triggerText} aria-hidden>
            <span className={styles.triggerCaption}>فونت</span>
            {/* روی دکمه فقط نامِ کوتاه؛ «(پیش‌فرض)» جای خودش در فهرست است. */}
            <span className={styles.triggerValue}>{active.label.split(" ")[0]}</span>
          </span>
        </Menu.Trigger>

        <Menu.Portal>
          <Menu.Content
            className={styles.menu}
            /* ⚠️ `side="top"`: داک پایینِ صفحه است، پس منو باید بالا باز
               شود. `collisionPadding` هم لازم است چون روی گوشیِ کوتاه،
               ارتفاعِ منو از فاصلهٔ داک تا بالای صفحه بیشتر می‌شود. */
            side="top"
            align="end"
            sideOffset={12}
            collisionPadding={12}
            loop
          >
            <div className={styles.head}>
              <span className={styles.title}>فونت متن</span>
            </div>

            <Menu.RadioGroup
              value={current}
              onValueChange={(value) =>
                applyReadingFont(value as ReadingFontId)
              }
              className={styles.list}
            >
              {READING_FONTS.map((font) => (
                <Menu.RadioItem
                  key={font.id}
                  value={font.id}
                  className={styles.item}
                  /* هر ردیف با قلمِ خودش نوشته می‌شود؛ فهرست خودش نمونه است. */
                  style={{ fontFamily: font.stack }}
                >
                  <span className={styles.tile} aria-hidden>
                    آ ب
                  </span>
                  <span className={styles.meta}>
                    <span className={styles.name}>{font.label}</span>
                    <span className={styles.sample}>
                      {READING_FONT_SAMPLE}
                    </span>
                  </span>
                  {current === font.id ? (
                    <span className={styles.check} aria-hidden>
                      <Check size={13} strokeWidth={3.4} />
                    </span>
                  ) : (
                    <span className={styles.checkSlot} aria-hidden />
                  )}
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
