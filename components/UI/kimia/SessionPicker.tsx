"use client";

import { KIMIA_CONFIG, type SessionLength } from "@/lib/kimia/config";

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const toFa = (n: number) => String(n).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

/** یک کلمه و یک زمانِ تقریبی برای هر طول، تا عدد تنها رها نباشد. */
const SHAPE: Record<number, { name: string; minutes: string }> = {
  5: { name: "کوتاه", minutes: "حدود ۴ دقیقه" },
  10: { name: "معمولی", minutes: "حدود ۸ دقیقه" },
  15: { name: "بلند", minutes: "حدود ۱۲ دقیقه" },
};

/**
 * انتخابِ طولِ نشست — سه رادیویِ واقعی.
 *
 * ── چرا `<input type="radio">` و نه `role="radio"`ِ دستی ─────────────────
 * ⚠️ نسخهٔ قبل یک `radiogroup`ِ دست‌ساز بود با سه `<button role="radio">`،
 * roving tabindex و مدیریتِ دستیِ جهت‌دارها. قراردادش درست پیاده شده بود،
 * ولی *هر سطرش* کدی بود که مرورگر مجانی می‌دهد: گروه‌بندی با `name`،
 * چرخشِ جهت‌دارها (با احترام به RTL)، یک توقف در ترتیبِ Tab، اعلامِ
 * «۲ از ۳» در صفحه‌خوان، و کار کردن داخلِ فرم. حالا همان‌ها از خودِ
 * پلتفرم می‌آیند و اینجا فقط ظاهر نوشته می‌شود.
 *
 * ⚠️ ورودی *پنهان نشده*، فقط نامرئی است: روی کلِ برچسب کشیده می‌شود
 * (`position:absolute; inset:0; opacity:0`). پس هنوز focus می‌گیرد، هنوز
 * کلیک‌پذیر است، و حلقهٔ focus را CSS روی خودِ کلید می‌کشد
 * (`:has(input:focus-visible)`). `display:none` یا `sr-only` هر دو این را
 * می‌شکستند.
 *
 * ⚠️ و انتخاب سه نشانه دارد و نه فقط رنگ: پُررنگ شدنِ سطح، حلقهٔ تأکید،
 * و پررنگ شدنِ عدد. کسی که رنگ را نمی‌بیند هم می‌داند کدام انتخاب شده.
 */
export default function SessionPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: SessionLength;
  onChange: (next: SessionLength) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset className="km-picker" disabled={disabled}>
      <legend className="km-picker-title">چند بیت؟</legend>

      <div className="km-picker-keys">
        {KIMIA_CONFIG.sessionLengths.map((n) => (
          <label key={n} className="km-picker-key">
            <input
              type="radio"
              className="km-picker-input"
              name="km-session-length"
              value={n}
              checked={n === value}
              onChange={() => onChange(n)}
            />
            <span className="km-picker-num game-num">{toFa(n)}</span>
            <span className="km-picker-name">{SHAPE[n]?.name}</span>
          </label>
        ))}
      </div>
      {/* فقط زمانِ گزینهٔ انتخاب‌شده — سه برچسبِ «حدود … دقیقه» کنارِ هم شلوغ بود. */}
      <p className="km-picker-time">{SHAPE[value]?.minutes}</p>
    </fieldset>
  );
}
