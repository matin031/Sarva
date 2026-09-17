"use client";

import { useEffect, useRef, useState } from "react";
import { ROLE_HUNT_CONFIG } from "@/lib/role-hunt/config";

/**
 * نمایشگرِ دیجیتالیِ نقش — `٭٭٭` تا «قید».
 *
 * ⚠️ چرا اصلاً انیمیشن دارد و متن ساده نیست:
 *
 * نقش، *سؤالِ* هر دور است. اگر مثلِ یک برچسبِ ثابت عوض شود، دانش‌آموزی که
 * حواسش به مدار است اصلاً نمی‌بیند سؤال تغییر کرده و با نقشِ دورِ قبل جواب
 * می‌دهد. رمزگشا همان نیم‌ثانیه‌ای را می‌سازد که چشم را به سؤال برمی‌گرداند
 * — یعنی کارِ کاربردی می‌کند و نه تزئینی.
 *
 * ⚠️ و عمداً glitch نیست. لرزشِ شدید و رنگ‌های پریده «خرابی» را تداعی
 * می‌کنند؛ اینجا باید حسِ «دارد رمز را باز می‌کند» بدهد: نویسه‌ها یکی‌یکی از
 * راست جا می‌افتند و بقیه کمی می‌لرزند.
 *
 * ⚠️ طولِ رشته از اولین فریم همان طولِ نقشِ نهایی است، پس هیچ‌چیزی روی صفحه
 * جابه‌جا نمی‌شود. اگر با سه ستاره شروع می‌شد و به «مضاف‌الیه» می‌رسید،
 * حباب در هر فریم پهن‌تر می‌شد و کلِ نوار می‌لرزید.
 */

/** استخرِ نویسه‌های درهم. حروفِ فارسی + چند نشانه، تا «دیجیتال» به نظر برسد. */
const POOL = "ابتثجحخدذرزسشصضطعغفقکگلمنوهی٭×٪≠";

function scramble(label: string, revealed: number, tick: number): string {
  let out = "";
  for (let i = 0; i < label.length; i++) {
    if (label[i] === " ") {
      out += " ";
      continue;
    }
    if (i < revealed) {
      out += label[i];
      continue;
    }
    /* ⚠️ شبه‌تصادفی و نه `Math.random()`: با تصادفِ واقعی، هر رندرِ دوبارهٔ
       React نویسه‌ها را هم عوض می‌کرد و لرزشِ اضافه می‌ساخت. اینجا نویسه
       تابعِ (گام، جایگاه) است، پس در یک گام همیشه همان است. */
    out += POOL[(i * 31 + tick * 17) % POOL.length];
  }
  return out;
}

export default function RoleDecoder({
  roleLabel,
  reduced,
}: {
  roleLabel: string;
  reduced: boolean;
}) {
  const steps = Math.max(2, Math.round(ROLE_HUNT_CONFIG.decoderMs / ROLE_HUNT_CONFIG.decoderStepMs));
  const [tick, setTick] = useState(0);
  const timer = useRef<number | null>(null);

  /* ⚠️ «از نو اجرا شدن با هر دور» با `key` انجام می‌شود و نه با یک افکت که
     شمارنده را صفر کند.

     نسخهٔ اول یک `setTick(0)` داخلِ افکت داشت و هم ESLint درست می‌گفت و هم
     رفتارش بد بود: یک رندرِ اضافه با نقشِ *دورِ قبل* روی صفحه می‌نشست و بعد
     پاک می‌شد. حالا کامپوننت با عوض شدنِ دور دوباره mount می‌شود، پس
     `useState(0)` خودش همان صفرِ لازم است — بدونِ هیچ رندرِ میانی. */
  useEffect(() => {
    /* حرکتِ کمتر: هیچ رمزگشایی، پس هیچ زمان‌سنجی هم نصب نمی‌شود. */
    if (reduced) return;

    timer.current = window.setInterval(() => {
      setTick((current) => {
        if (current >= steps) {
          if (timer.current !== null) window.clearInterval(timer.current);
          return steps;
        }
        return current + 1;
      });
    }, ROLE_HUNT_CONFIG.decoderStepMs);

    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
    };
  }, [reduced, steps]);

  /* ⚠️ `reduced` اینجا هم خوانده می‌شود و نه فقط در افکت: اگر کاربر وسطِ
     بازی «حرکتِ کمتر» را روشن کند، افکت زمان‌سنج را برمی‌دارد و شمارنده هر
     جا بود همان‌جا می‌ماند — بدونِ این شرط، نقش برای همیشه نیمه‌رمزگشایی
     می‌ماند. */
  const settled = reduced || tick >= steps;
  const revealed = settled ? roleLabel.length : Math.floor((tick / steps) * roleLabel.length);
  const shown = settled ? roleLabel : scramble(roleLabel, revealed, tick);

  return (
    <div className="rh-decoder" dir="rtl">
      <span className="rh-decoder-label">نقش</span>

      {/* ⚠️ فقط مقدارِ *نهایی* به فناوری‌های کمکی می‌رسد.
          خواندنِ «٭ق٭» با صفحه‌خوان هیچ معنایی ندارد و در هر گام یک اعلام
          تازه می‌ساخت. پس نویسه‌های متحرک از دسترسِ آن پنهان‌اند و یک متنِ
          مخفیِ زنده، نقشِ کامل را یک بار اعلام می‌کند. */}
      <span className="rh-decoder-value game-display" aria-hidden="true">
        {[...shown].map((glyph, index) => (
          <span
            key={index}
            className="rh-glyph"
            data-scrambled={!settled && index >= revealed}
            style={{ "--rh-glyph-index": index } as React.CSSProperties}
          >
            {glyph}
          </span>
        ))}
      </span>

      <span className="sr-only" aria-live="polite">
        {settled ? `نقش: ${roleLabel}` : ""}
      </span>
    </div>
  );
}
