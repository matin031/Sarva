"use client";

import Link from "next/link";
import { GameBarPlain } from "./GameBar";
import { GeometricPattern } from "@/components/persian-patterns";
import { useCurrentUser } from "@/lib/auth/use-current-user";

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const toFa = (n: number) => String(n).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

/**
 * پایانِ نشست — روی همان سطحِ شیشه‌ایِ بقیهٔ بازی.
 *
 * ⚠️ دو عددِ متفاوت و نه یکی: «چندتا را ساختی» و «چندتا را بارِ اول
 * ساختی». اولی تشویق است و دومی همان چیزی است که در کارنامه می‌نشیند.
 * یکی کردنشان یعنی یا تلاش کردن را بی‌ارزش نشان بدهیم یا شاهدِ یادگیری را
 * گم کنیم.
 *
 * ⚠️ و برای مهمان صریح نوشته می‌شود که چیزی ثبت نشده.
 */
export default function KimiaResult({
  total,
  solved,
  firstTry,
  onRestart,
}: {
  total: number;
  solved: number;
  firstTry: number;
  onRestart: () => void;
}) {
  const { user } = useCurrentUser();
  const ratio = total > 0 ? solved / total : 0;

  return (
    <div className="km-session" dir="rtl">
      <div className="km-backdrop" aria-hidden>
        <GeometricPattern className="km-backdrop-pattern" opacity={0.035} />
        <span className="km-backdrop-vignette" />
        <span className="km-backdrop-beam" />
      </div>

      <GameBarPlain label="پایان نشست" />

      <div className="km-session-stage">
        {/* شیشهٔ نگه‌دارندهٔ نتیجه — همان جنسِ محفظهٔ ترکیب، در قابِ کوچک‌تر. */}
        <div className="km-session-vessel">
          <span className="km-session-fill" style={{ "--km-ratio": ratio } as React.CSSProperties} aria-hidden />
          <span className="km-session-sheen" aria-hidden />
          <span className="km-session-lip" aria-hidden />
        </div>

        <h2 className="km-session-title game-display">
          {solved === total
            ? "همهٔ ترکیب‌ها پایدار شدند"
            : solved === 0
              ? "این بار ترکیبی پایدار نشد"
              : "کار امروز کیمیاگر"}
        </h2>

        <dl className="km-session-stats">
          <div className="km-session-stat">
            <dt>ساخته‌شده</dt>
            <dd className="game-num">
              {toFa(solved)} / {toFa(total)}
            </dd>
          </div>
          <span className="km-session-divider" aria-hidden />
          <div className="km-session-stat">
            <dt>بار اول درست</dt>
            <dd className="game-num">{toFa(firstTry)}</dd>
          </div>
        </dl>

        <p className="km-session-note">
          {user
            ? "نتیجهٔ هر بیت در کارنامه‌ات ثبت شد؛ تحلیل وزن‌ها را در پنل می‌بینی."
            : "برای اینکه نتیجه‌ها در کارنامه‌ات بمانند، وارد شو."}
        </p>

        <div className="km-session-actions">
          <button type="button" className="km-cta" onClick={onRestart}>
            نشست تازه
          </button>
          <Link href="/game" className="km-tertiary km-session-back">
            بازگشت به بازی‌ها
          </Link>
        </div>
      </div>
    </div>
  );
}
