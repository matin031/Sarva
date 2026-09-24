"use client";

import { useSyncExternalStore } from "react";
import GameReportButton from "@/components/UI/games/GameReportButton";
import { GameBackButton, gameIconButton } from "@/components/UI/games/GameNav";
import { isSfxEnabled, setSfxEnabled, sfxServerSnapshot, subscribeSfx } from "@/lib/kimia/sfx";

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const toFa = (n: number) => String(n).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

/**
 * نوارِ بالای آزمایشگاه.
 *
 * ── چرا خودِ بازی این را می‌سازد و نه `GameShell` ─────────────────────────
 * ⚠️ کیمیا پوستهٔ سایت را جمع می‌کند (`immersiveMode`)، و در آن حالت نوارِ
 * خودِ `GameShell` اصلاً رندر نمی‌شود — همان‌طور که برای «مدارِ دستور» و
 * «پلِ وزن» هم نمی‌شود. پس راهِ خروج و دکمهٔ گزارش باید اینجا باشند، وگرنه
 * بازیکنی که وسطِ کار است هیچ‌کدام را ندارد.
 *
 * ── چرا یک نوار و نه سه چیزِ شناور ───────────────────────────────────────
 * نسخهٔ قبلی سه عنصرِ بی‌ربط داشت: پیوندِ بازگشتِ پوسته بالا، شمارندهٔ دور
 * زیرش، و دکمهٔ گزارش جایی در گوشه. سه ارتفاعِ متفاوت، سه وزنِ بصری، و
 * هیچ‌کدام عضوِ یک سیستم نبودند. اینجا هر سه روی یک خط، با یک زمینهٔ
 * مشترکِ بسیار کم‌رنگ، یک واحد می‌شوند.
 *
 * ⚠️ «گزارشِ مشکل» عمداً سومین چیز است و pill پررنگ ندارد: کاری است که
 * یک نفر از هر پانصد نفر می‌کند.
 */
export default function GameBar({
  round,
  total,
  onLeave,
}: {
  round: number;
  total: number;
  onLeave: () => void;
}) {
  return (
    <header className="km-bar" dir="rtl">
      <GameBackButton onClick={onLeave} />

      {/* ⚠️ شمارنده مرکزِ نوار است و نه یک badge در گوشه: تنها اطلاعاتِ
          وضعیتی است که بازیکن وسطِ نشست لازم دارد. */}
      <p className="km-bar-round">
        <span className="km-bar-round-label">بیت</span>
        <span className="km-bar-round-num game-num">{toFa(round)}</span>
        <span className="km-bar-round-sep" aria-hidden />
        <span className="km-bar-round-total game-num">{toFa(total)}</span>
      </p>

      <div className="km-bar-side">
        <SfxToggle />
        <GameReportButton />
      </div>
    </header>
  );
}

/**
 * خاموش/روشنِ جلوه‌های صوتی.
 *
 * ⚠️ این **ریتمِ بیت را خاموش نمی‌کند** و همین تفکیک نکتهٔ اصلی است:
 * ریتم محتوای آموزشی است و پخشش را خودِ کاربر با دکمهٔ ریل شروع می‌کند؛
 * جلوه‌ها تزئین‌اند. کسی که در کلاس نشسته باید بتواند تق‌وتوقِ شیر و
 * تزریق را ببندد و هنوز ریتم را بشنود.
 */
function SfxToggle() {
  const on = useSyncExternalStore(subscribeSfx, isSfxEnabled, sfxServerSnapshot);
  return (
    <button
      type="button"
      className={`${gameIconButton} game-nav-toggle`}
      data-on={on || undefined}
      onClick={() => setSfxEnabled(!on)}
      aria-pressed={on}
      aria-label={on ? "خاموش کردنِ جلوه‌های صوتی" : "روشن کردنِ جلوه‌های صوتی"}
      title={on ? "جلوه‌های صوتی روشن است" : "جلوه‌های صوتی خاموش است"}
    >
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4z" />
        {on ? (
          <>
            <path strokeLinecap="round" d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path strokeLinecap="round" d="M18 6a8.5 8.5 0 0 1 0 12" />
          </>
        ) : (
          <path strokeLinecap="round" d="m16 9.5 5 5m0-5-5 5" />
        )}
      </svg>
    </button>
  );
}

/**
 * همان نوار، برای صفحه‌هایی که شمارنده ندارند (معرفی و نتیجه).
 *
 * ⚠️ `label` اختیاری است و صفحهٔ معرفی عمداً نمی‌دهدش: آن صفحه خودش یک
 * `<h1>` با همان کلمه دارد و نوشتنِ «کیمیای وزن» در نوار، همان عنوان را
 * چند سانتی‌متر بالاتر تکرار می‌کرد.
 */
export function GameBarPlain({ label }: { label?: string }) {
  return (
    <header className="km-bar km-bar-plain" data-bare={label ? undefined : true} dir="rtl">
      <GameBackButton href="/game" />
      {label ? (
        <p className="km-bar-round">
          <span className="km-bar-round-label">{label}</span>
        </p>
      ) : (
        <span />
      )}
      <div className="km-bar-side" />
    </header>
  );
}
