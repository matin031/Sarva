import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  LITERARY_PAIRS,
  MEMORY_ROUND_PAIRS,
  buildMemoryDeck,
  buildMemoryRounds,
  memoryGridColumns,
  memoryRoundSizes,
  type LiteraryPair,
} from "@/lib/literary-pairs";

/**
 * چیدمانِ زمین و تقسیمِ نشست در «جفت‌های ادبی».
 *
 * ⚠️ این تست‌ها دو قاعده را نگه می‌دارند که هر دو از اشکالِ دیده‌شده آمده‌اند:
 *
 *   ۱) **کارتِ تنها ممنوع.** دسته‌ای با ۱۳ جفت، یعنی ۲۶ کارت، در شبکهٔ
 *      شش‌ستونی چهار ردیفِ پر می‌ساخت و بعد دو کارتِ تنها در ردیفِ آخر. آن دو
 *      از آن‌طرفِ صفحه دیده می‌شدند و پیش از شروع معلوم بود جفتِ هم‌اند.
 *
 *   ۲) **دست‌ها روی هم کلِ آزمون‌اند.** وقتی به دانش‌آموز می‌گوییم «این آزمون
 *      سه دست است»، آن جمله فقط وقتی راست است که هر جفت دقیقاً یک بار در
 *      یکی از دست‌ها بیاید — نه نمونه‌گیریِ تصادفیِ مستقل.
 */

const tidy = (cards: number, cols: number) => cards % cols === 0 || cards <= cols;

function deckOf(n: number): LiteraryPair[] {
  return Array.from({ length: n }, (_, i) => ({
    work: `اثر ${i}`,
    author: `پدیدآورندهٔ ${i}`,
  }));
}

describe("زمینِ جفت‌های ادبی", () => {
  test("هیچ دستی کارتِ تنها در ردیف آخر نمی‌گذارد", () => {
    for (let total = 1; total <= 60; total++) {
      for (const size of memoryRoundSizes(total)) {
        const cards = size * 2;
        const { base, wide } = memoryGridColumns(cards);

        assert.ok(
          tidy(cards, wide),
          `${total} جفت → دستِ ${size}تایی در ${wide} ستونِ صفحهٔ بزرگ ردیفِ ناقص می‌سازد`,
        );
        assert.ok(
          tidy(cards, base),
          `${total} جفت → دستِ ${size}تایی در ${base} ستونِ موبایل ردیفِ ناقص می‌سازد`,
        );
      }
    }
  });

  test("هیچ دستی از سقف بزرگ‌تر نیست و هیچ دستی خالی نیست", () => {
    for (let total = 1; total <= 60; total++) {
      const sizes = memoryRoundSizes(total);
      assert.ok(sizes.length > 0, `${total} جفت هیچ دستی نساخت`);
      for (const size of sizes) {
        assert.ok(size >= 1, "دستِ خالی بی‌معناست");
        assert.ok(size <= MEMORY_ROUND_PAIRS, `دستِ ${size}تایی از سقف بیشتر است`);
      }
    }
  });

  test("مجموعِ دست‌ها دقیقاً همان تعدادِ جفت‌هاست", () => {
    for (let total = 0; total <= 60; total++) {
      const sum = memoryRoundSizes(total).reduce((a, b) => a + b, 0);
      assert.equal(sum, total, `${total} جفت در دست‌ها گم یا تکرار شد`);
    }
  });

  test("دست‌ها یک افرازند: هر جفت دقیقاً یک بار", () => {
    for (const total of [1, 5, 7, 13, 18, 25]) {
      const rounds = buildMemoryRounds(deckOf(total));
      const seen = rounds.flat().map((p) => p.work);

      assert.equal(seen.length, total, `${total} جفت → ${seen.length} جفت در دست‌ها`);
      assert.equal(new Set(seen).size, total, `${total} جفت → جفتِ تکراری بین دست‌ها`);
    }
  });

  test("دستهٔ چیده‌شده دو کارت برای هر جفت دارد و هیچ‌کدام تک نیست", () => {
    const round = buildMemoryRounds(deckOf(13))[0];
    const deck = buildMemoryDeck(round);

    assert.equal(deck.length, round.length * 2);
    const byPair = new Map<number, number>();
    for (const card of deck) byPair.set(card.pairId, (byPair.get(card.pairId) ?? 0) + 1);
    for (const [pairId, count] of byPair) {
      assert.equal(count, 2, `جفتِ ${pairId} تک‌کارت افتاده`);
    }
    assert.equal(byPair.size, round.length);
  });

  test("فهرستِ پیش‌فرضِ داخلِ کد هم زمینِ درستی می‌سازد", () => {
    for (const round of buildMemoryRounds(LITERARY_PAIRS)) {
      const deck = buildMemoryDeck(round);
      const { base, wide } = memoryGridColumns(deck.length);
      assert.ok(tidy(deck.length, wide));
      assert.ok(tidy(deck.length, base));
    }
  });
});
