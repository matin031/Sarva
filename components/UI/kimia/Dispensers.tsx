"use client";

import { useEffect, useState } from "react";
import TestTube from "./TestTube";
import VialCoverflow from "./VialCoverflow";
import { KIMIA_CONFIG } from "@/lib/kimia/config";
import { KIMIA_FOOT_CATALOG } from "@/lib/kimia/catalog";
import type { FootKey } from "@/lib/kimia/types";

/**
 * پخش‌کننده‌ها — شانزده رکنِ کاتالوگ، هر کدام یک شیشهٔ همیشه‌پر.
 *
 * ⚠️ یک رکن ممکن است در یک بیت چهار بار بیاید (مستفعلن ×۴). پس شیشهٔ
 * پایین سرِ جایش می‌ماند و هر لمس یک *کپی* می‌فرستد بالا.
 *
 * ── دو چیدمان، یک منطق ──────────────────────────────────────────────────
 * ⚠️ مرزِ ۹۰۰ پیکسل: بالای آن، هر شانزده ماده در *یک ردیف* با گامِ برابر
 * جا می‌شوند و دیدنِ هم‌زمانشان بهترین چیز است. زیرِ آن، ردیف یا سه‌طبقه
 * می‌شود (و بودجهٔ ارتفاع را می‌شکند) یا لوله‌ها به ۲۰ پیکسل می‌رسند؛
 * آنجا چرخ‌فلک می‌آید.
 *
 * ⚠️ هیچ‌کدام از propهای بازی بینِ این دو فرق نمی‌کنند: منطقِ بازی اصلاً
 * نمی‌داند کدام چیدمان روی صفحه است.
 */

/**
 * جای شیشهٔ یک رکن، برای مبدأِ پروازِ FLIP.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ⚠️ چرا از DOM پرسیده می‌شود و نه از یک ref
 * ═══════════════════════════════════════════════════════════════════════
 * نسخهٔ اول این را با `useImperativeHandle` می‌داد و *خاموش* شکست: در
 * حالتِ توسعه، React کامپوننت را دوبار سوار می‌کند و `ref.current` روی
 * handleِ نمونهٔ مرده می‌ماند — نمونه‌ای که هیچ شیشه‌ای رندر نکرده. نتیجه
 * این بود که مبدأ همیشه `null` می‌شد و پرواز بی‌صدا به یک fade تنزل
 * می‌کرد. (با شناسهٔ نمونه در کنسول ثابت شد: refها روی `udnk` نشسته
 * بودند و handle روی `nzap`.)
 *
 * پرسیدن از DOM این کلاسِ باگ را کلاً حذف می‌کند: «کجاست؟» را از خودِ
 * صفحه می‌پرسیم، نه از یک اشاره‌گر که ممکن است کهنه باشد.
 */
export function dispenserRectFor(foot: FootKey): DOMRect | null {
  if (typeof document === "undefined") return null;
  const host = document.querySelector<HTMLElement>(`[data-dispenser="${CSS.escape(foot)}"]`);
  const tube = host?.querySelector<HTMLElement>(".km-tube") ?? host;
  return tube?.getBoundingClientRect() ?? null;
}

/**
 * مقصدِ شبحِ شیشه‌ای که از رَک برمی‌گردد.
 *
 * ⚠️ روی چرخ‌فلک *مرکزِ ریل* است و نه خودِ آن ماده: ممکن است آن ماده
 * اصلاً بیرونِ دید باشد، و شبحی که به بیرونِ کادر پرواز کند از نبودنش
 * بدتر است.
 */
export function dispenserHomeFor(foot: FootKey): DOMRect | null {
  if (typeof document === "undefined") return null;
  const rail = document.querySelector<HTMLElement>("[data-carousel]");
  if (rail) {
    const r = rail.getBoundingClientRect();
    const item = rail.querySelector<HTMLElement>(".km-cf-item[data-centered]");
    const w = item?.getBoundingClientRect().width ?? r.width * 0.25;
    return new DOMRect(r.left + r.width / 2 - w / 2, r.top, w, r.height);
  }
  return dispenserRectFor(foot);
}

/**
 * ⚠️ روی سرور همیشه `false` و بعد از mount اصلاح می‌شود. حدس زدنِ همان
 * رندرِ اول یعنی hydration mismatch.
 */
function useNarrow(maxWidth: number): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${maxWidth - 1}px)`);
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [maxWidth]);
  return narrow;
}

export default function Dispensers({
  disabled,
  recentFoot,
  pulse,
  onPick,
}: {
  disabled: boolean;
  recentFoot: FootKey | null;
  /** رکنی که همین حالا کپی داده — یک تپشِ کوتاه. */
  pulse: { foot: FootKey; seq: number } | null;
  onPick: (foot: FootKey) => void;
}) {
  const narrow = useNarrow(900);

  /* تپشِ خودِ پخش‌کننده. با WAAPI و نه با یک کلاسِ CSS: کلاس باید در فریمِ
     بعد برداشته شود تا بارِ دوم دوباره اجرا شود. */
  useEffect(() => {
    /* ⚠️ روی چرخ‌فلک تپشی نیست و لازم هم نیست: آنجا ماده *وسطِ ریل* است
       و خودِ مرکز بودنش گفته که کدام است. */
    if (!pulse || narrow) return;
    const node = document.querySelector<HTMLElement>(
      `[data-dispenser="${CSS.escape(pulse.foot)}"] .km-tube`,
    );
    if (!node) return;
    const animation = node.animate(
      [{ transform: "scale(1)" }, { transform: "scale(.93)" }, { transform: "scale(1)" }],
      { duration: KIMIA_CONFIG.motion.place.dispensePulseMs, easing: "ease-out" },
    );
    return () => animation.cancel();
  }, [narrow, pulse]);

  if (narrow) {
    return (
      <VialCoverflow disabled={disabled} recentFoot={recentFoot} onPick={onPick} />
    );
  }

  return (
    <section className="km-dispensers" aria-label="ارکانِ عروضی">
      <ul className="km-dispenser-grid">
        {KIMIA_FOOT_CATALOG.map((foot) => (
          <li key={foot} className="km-dispenser-cell" data-dispenser={foot}>
            <TestTube
              foot={foot}
              role="dispenser"
              label="full"
              disabled={disabled}
              recent={recentFoot === foot}
              ariaLabel={`${foot} — افزودن به جایگاهِ بعدی`}
              onActivate={() => onPick(foot)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
