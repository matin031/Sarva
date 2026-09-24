"use client";

import RhythmBar from "./RhythmBar";
import { KIMIA_COPY } from "@/lib/kimia/copy";
import { joinArk } from "@/lib/kimia/catalog";
import type { FootKey, KimiaSolution } from "@/lib/kimia/types";

/**
 * وجه پشت کارت — جایی که بالاخره پاسخ نوشته می‌شود.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ⚠️ چرا این صفحه وجود دارد
 * ═══════════════════════════════════════════════════════════════════════
 * تا دیروز، بازیکنی که سه بار اشتباه می‌کرد هیچ‌وقت پاسخ را نمی‌دید. یعنی
 * سخت‌ترین بیت‌ها — همان‌ها که بیشترین چیز برای یاد دادن داشتند — تنها
 * بیت‌هایی بودند که چیزی یاد نمی‌دادند. و بازیکنی که *درست* می‌زد هم فقط
 * یک تیک سبز می‌گرفت؛ نه می‌دید چه ساخته، نه چرا درست بوده.
 *
 * حالا کارت برمی‌گردد و هر سه حالت یک پایان دارند: شعر، وزنش، و ریتمی که
 * از آن درمی‌آید.
 *
 * ── چه چیزی نشان داده می‌شود ───────────────────────────────────────────
 * درست چید  → چیدمان *خودش*. اگر خوانش بدیل ساخته، همان نشان داده
 *              می‌شود و نه متعارف؛ وگرنه فکر می‌کند اشتباه کرده.
 * نشان داده → ردیف بالا پاسخ متعارف، ردیف پایین چیدمان او با نشانهٔ
 *              غیررنگی روی رکن‌های غلط.
 *
 * ⚠️ خوانش‌های دیگر هم می‌آیند (کم‌رنگ، با برچسب «خوانش دیگر»). سه وزن این
 * دامنه دو تقطیع معتبر دارند و پنهان کردن دومی یعنی آموزش غلط.
 *
 * ── و چه چیزی نشان داده نمی‌شود ────────────────────────────────────────
 * ⚠️ تطبیق هجا با کلمه‌های شعر. در داده نیست — نه در بانک پرسش‌ها و نه در
 * `kimia_rounds`. موتور عروض می‌تواند حدسش را بزند و آن حدس اینجا ساخته
 * نمی‌شود: تقطیع حدسی که به‌عنوان «درست» زیر شعر بنشیند، از نبودنش بدتر
 * است.
 */
export default function VerseBack({
  lines,
  solution,
  yours,
  solved,
}: {
  lines: readonly string[];
  solution: KimiaSolution;
  /** چیدمان خود بازیکن در آخرین تلاش. */
  yours: readonly FootKey[];
  /** خودش ساخت (در برابر: پاسخ نشانش داده شد). */
  solved: boolean;
}) {
  /* ⚠️ وقتی خودش درست چیده، *همان* چیدمان نشان داده می‌شود و نه متعارف.
     خوانش بدیل هم یک پاسخ درست است. */
  const primary = solved && yours.length > 0 ? yours : solution.canonical;
  const primaryText = joinArk(primary);

  /* خوانش‌های دیگرِ همین وزن، غیر از آنچه بالا نشان داده شد.
     ⚠️ یکتاسازی روی *متن* و نه روی مرجع آرایه: یک وزن می‌تواند دو ورودی
     هم‌محتوا داشته باشد و آن‌وقت دو ردیف «خوانش دیگر» کاملاً یکسان زیر
     هم می‌نشست (در پیش‌نمایش دیده شد).
     ⚠️ و حداکثر یکی: کارت ارتفاع ثابت دارد و ردیف سوم شعر را می‌پوشاند.
     در بانک امروز هیچ وزنی بیش از دو خوانش ندارد. */
  const others: (readonly FootKey[])[] = [];
  const seen = new Set([primaryText]);
  for (const seq of solution.accepted) {
    const text = joinArk(seq);
    if (seen.has(text)) continue;
    seen.add(text);
    others.push(seq);
    if (others.length === 1) break;
  }

  /* در حالت نمایش پاسخ، کدام رکن‌های بازیکن با پاسخ نمی‌خوانند. */
  const wrongAt = new Set<number>();
  if (!solved) {
    for (let i = 0; i < yours.length; i += 1) {
      if (yours[i] !== primary[i]) wrongAt.add(i);
    }
  }

  return (
    <div className="km-back">
      <header className="km-back-head" style={{ "--i": 0 } as React.CSSProperties}>
        {/* مُهر: تیک وقتی خودش درست چیده، چشم وقتی پاسخ نشان داده شده. */}
        <span className="km-back-seal" data-solved={solved || undefined} aria-hidden>
          {solved ? (
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M5.5 12.5 10 17l8.5-9.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
          )}
        </span>
        <span className="km-back-titles">
          <span className="km-back-meter game-title">{solution.meterName}</span>
          <span className="km-back-tag" data-solved={solved || undefined}>
            {solved ? KIMIA_COPY.back.solved : KIMIA_COPY.back.shown}
          </span>
        </span>
      </header>

      {/* همان شعر، همان قلم. کارت که برمی‌گردد نباید متن عوض شود. */}
      <div className="km-back-verse" style={{ "--i": 1 } as React.CSSProperties}>
        {lines.map((line, i) => (
          <p key={i} className="km-verse-line game-verse">
            {line}
          </p>
        ))}
      </div>

      <div className="km-back-bars" style={{ "--i": 2 } as React.CSSProperties}>
        <RhythmBar feet={primary} />

        {others.map((seq) => (
          <RhythmBar key={joinArk(seq)} feet={seq} dim label={KIMIA_COPY.back.alternate} />
        ))}

        {/* ⚠️ فقط وقتی پاسخ *نشان داده* شده. اگر خودش درست چیده، ردیف
            بالا همان چیدمان اوست و تکرارش بی‌معناست. */}
        {!solved && yours.length > 0 ? (
          <RhythmBar feet={yours} dim wrongAt={wrongAt} label={KIMIA_COPY.back.yours} />
        ) : null}
      </div>
    </div>
  );
}
