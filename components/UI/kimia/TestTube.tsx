"use client";

import { forwardRef } from "react";
import FootGlyph from "./FootGlyph";
import { KIMIA_CONFIG } from "@/lib/kimia/config";
import { liquidShades } from "@/lib/kimia/mix";
import { footVisual } from "@/lib/kimia/visuals";
import type { FootKey } from "@/lib/kimia/types";

/**
 * یک لولهٔ آزمایش — تنها شیءِ فیزیکیِ این بازی.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ⚠️ یک کامپوننت برای هر سه جا، و این عمدی است
 * ═══════════════════════════════════════════════════════════════════════
 * همین شیء در سه نقش ظاهر می‌شود: پخش‌کننده، شیشهٔ نشسته در رَک، و
 * شیشه‌ای که بالای بیت کج می‌شود و می‌ریزد. اگر هر کدام کامپوننتِ خودش
 * را داشت، «کپی‌ای که از پخش‌کننده به رَک می‌پرد» باید بینِ دو ظاهرِ
 * متفاوت morph می‌کرد — و FLIP دقیقاً همان‌جا می‌شکند.
 *
 * ⚠️ `plain` برای وقتی است که لوله *داخلِ* یک دکمهٔ دیگر می‌نشیند
 * (آیتمِ چرخ‌فلکِ گوشی). دکمه داخلِ دکمه HTMLِ نامعتبر است، ولی داشتنِ
 * یک نسخهٔ دومِ تصویری هم یعنی دو ظاهری که با هم از رده خارج می‌شوند.
 *
 * ── سطحِ مایع ────────────────────────────────────────────────────────────
 * ⚠️ مایع یک مستطیلِ خیلی بزرگ است که فقط لبهٔ بالایش دیده می‌شود، و
 * چرخشش دقیقاً خلافِ چرخشِ لوله است. یعنی سطحِ مایع در دنیای واقعی افقی
 * می‌ماند، بدونِ اینکه کسی جایی زاویه را دوباره حساب کند.
 *
 * ── ظاهر ────────────────────────────────────────────────────────────────
 * ⚠️ نه گرادیانِ شیشه، نه بازتاب، نه سایهٔ داخلی. لوله از دو سطحِ تخت
 * ساخته می‌شود (بدنهٔ خالی و مایع) با یک خطِ مرزِ نازک. تنها خطِ اضافه
 * منیسک است، و آن هم *اطلاعات* است: سطحِ مایع.
 */

export type TubeRole = "dispenser" | "placed";

const TestTube = forwardRef<
  HTMLElement,
  {
    foot: FootKey;
    role: TubeRole;
    /** کسری از حجمِ لوله که مایع دارد. پیش‌فرض: مایعِ ساکن. */
    fill?: number;
    /** برچسبِ زیرِ لوله: نام و نشانه، فقط نام، یا هیچ. */
    label?: "full" | "name" | "none";
    disabled?: boolean;
    /** وسطِ ریختن — برچسب محو می‌شود و لوله از جریانِ عادی بیرون می‌آید. */
    pouring?: boolean;
    /** آخرین ماده‌ای که کاربر ریخته. فقط یک تأکیدِ بسیار ظریف. */
    recent?: boolean;
    /** بدونِ دکمه — وقتی لوله داخلِ یک دکمهٔ دیگر می‌نشیند. */
    plain?: boolean;
    ariaLabel?: string;
    onActivate?: () => void;
  }
>(function TestTube(
  { foot, role, fill, label = "full", disabled, pouring, recent, plain, ariaLabel, onActivate },
  ref,
) {
  const { color, pattern } = footVisual(foot);
  const { top, base, deep } = liquidShades(color);
  const level = fill ?? KIMIA_CONFIG.motion.fluid.restFill;

  const body = (
    <>
      <span className="km-tube-body" aria-hidden>
        <span className="km-tube-glass">
          <span className="km-tube-liquid">
            <span className="km-tube-meniscus" />
          </span>
        </span>
        <span className="km-tube-rim" />
      </span>

      {label !== "none" && (
        <span className="km-tube-label">
          <b className="km-tube-name">{foot}</b>
          {label === "full" && (
            <i className="km-tube-glyph" aria-hidden>
              <FootGlyph pattern={pattern} />
            </i>
          )}
        </span>
      )}
    </>
  );

  const style = {
    "--km-ink": base,
    "--km-ink-top": top,
    "--km-ink-deep": deep,
    "--km-fill": level,
  } as React.CSSProperties;

  if (plain) {
    return (
      <span
        ref={ref as React.Ref<HTMLSpanElement>}
        className="km-tube"
        data-role={role}
        data-pouring={pouring || undefined}
        data-recent={recent || undefined}
        style={style}
      >
        {body}
      </span>
    );
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type="button"
      className="km-tube"
      data-role={role}
      data-pouring={pouring || undefined}
      data-recent={recent || undefined}
      aria-disabled={disabled || undefined}
      aria-label={ariaLabel}
      onClick={() => {
        if (disabled) return;
        onActivate?.();
      }}
      style={style}
    >
      {body}
    </button>
  );
});

export default TestTube;
