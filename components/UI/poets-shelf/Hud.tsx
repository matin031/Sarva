"use client";

import type { MachineState } from "@/lib/poets-shelf/machine";

/* ═══════════════════════════════════════════════════════════════════════════
   HUD — پرسش، امتیاز، و بازخورد. همه در DOM.
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ چرا بیرونِ بوم.

   متنِ این بازی فارسی است و باید شکل بگیرد، راست‌به‌چپ بچیند، با بزرگ‌نماییِ
   مرورگر بزرگ شود و برای صفحه‌خوان خوانده شود. هیچ‌کدام از این‌ها از یک
   بافتِ متنی روی بوم برنمی‌آید.

   بوم `aria-hidden` است؛ کلِ محتوای معناییِ بازی از همین‌جا و از برچسب‌های
   روی کتاب‌ها می‌آید.
   ═══════════════════════════════════════════════════════════════════════════ */

const FA = new Intl.NumberFormat("fa-IR");

export interface HudProps {
  machine: MachineState;
}

export function Hud({ machine }: HudProps) {
  /* ⚠️ `outcome` عمداً خوانده نمی‌شود: خودِ `state` نتیجه را می‌گوید
     (`success` در برابرِ `failure`). خواندنِ هر دو یعنی دو منبع برای یک
     حقیقت، که می‌توانند یک فریم از هم عقب بیفتند. */
  const { round, state, score, streak, roundNumber } = machine;

  /* پیامِ بازخورد. `null` یعنی هنوز چیزی برای گفتن نیست. */
  const feedback =
    state === "success"
      ? { tone: "correct" as const, text: "آفرین! درست بود." }
      : state === "failure" && round
        ? { tone: "wrong" as const, text: `درستش «${round.answer.title}» بود.` }
        : null;

  return (
    <div className="ps-hud" dir="rtl">
      <div className="ps-hud__question">
        <span className="ps-hud__prompt">کدام اثر از</span>
        {/* ⚠️ `key` روی نامِ پدیدآورنده است تا با هر دور انیمیشنِ ورود دوباره
            اجرا شود. بدونِ آن، متن بی‌صدا عوض می‌شد و بازیکن متوجهِ پرسشِ
            تازه نمی‌شد. */}
        <strong key={round?.author.id ?? "none"} className="ps-hud__author">
          {round?.author.name ?? "…"}
        </strong>
        <span className="ps-hud__prompt">است؟</span>
      </div>

      <dl className="ps-hud__stats">
        <div className="ps-hud__stat">
          <dt>امتیاز</dt>
          <dd>{FA.format(score)}</dd>
        </div>
        <div className="ps-hud__stat">
          <dt>دور</dt>
          <dd>{FA.format(Math.max(1, roundNumber))}</dd>
        </div>
        <div className="ps-hud__stat" data-hot={streak >= 3 ? "" : undefined}>
          <dt>زنجیره</dt>
          <dd>{FA.format(streak)}</dd>
        </div>
      </dl>

      {/* ⚠️ `aria-live` روی یک ظرفِ *همیشه‌موجود* است و نه روی خودِ پیام.
          ناحیه‌ای که با پیام ساخته شود، در بیشترِ صفحه‌خوان‌ها اعلام نمی‌شود
          چون در لحظهٔ افزوده‌شدن هنوز ثبت نشده است. */}
      <div className="ps-hud__feedback" role="status" aria-live="polite">
        {feedback && (
          <p className="ps-hud__feedback-text" data-tone={feedback.tone}>
            {/* نشانهٔ شکلی کنارِ رنگ: صورت‌مسئله صریح بود که درست و نادرست
                نباید فقط با رنگ گفته شوند. */}
            <span aria-hidden="true" className="ps-hud__feedback-mark">
              {feedback.tone === "correct" ? "✓" : "✕"}
            </span>
            {feedback.text}
          </p>
        )}
      </div>
    </div>
  );
}
