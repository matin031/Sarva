/**
 * بخشِ بی‌دیتابیسِ `scripts/seed-rang-ara.ts`: کدام بیت‌ها، و با ردیفی که از
 * قبل هست چه باید کرد. جدا شده تا آزمون بدونِ اتصال بسنجدش.
 */
import { OUTSIDE_RAW_LEVELS } from "../../lib/rang-ara/content";
import type { VerseRecord } from "../../lib/rang-ara/verse";
import { BOOK_RAW } from "./book-seed";

export type Seed = {
  key: string;
  verse: Omit<VerseRecord, "id">;
  /** وضعیتِ ردیفی که *تازه* درج می‌شود. */
  published: boolean;
  /**
   * پیش‌نویسِ موجود با `--update` منتشر شود؟ فقط بیت‌های کتاب و فقط با
   * `--publish-book`. بیت‌های خارج از کتاب منتشرشده درج می‌شوند، ولی اگر مدیر
   * یکی را بعداً برداشته باشد، seed برش نمی‌گرداند.
   */
  promote: boolean;
  sort: number;
};

export function buildSeeds(publishBook: boolean): Seed[] {
  return [
    ...OUTSIDE_RAW_LEVELS.map((l, i) => ({
      key: `outside:${l.id}`,
      verse: {
        grade: null,
        lesson: null,
        poet: l.poet,
        source: l.source ?? null,
        lines: l.lines,
        meaning: l.meaning ?? null,
        steps: l.steps,
      },
      published: true,
      promote: false,
      sort: i + 1,
    })),
    ...BOOK_RAW.map((l) => ({
      key: `book:${l.id}`,
      verse: {
        grade: l.book.grade,
        lesson: l.book.lesson,
        poet: l.poet,
        source: null,
        lines: [l.lines[0], l.lines[1]] as [string, string],
        meaning: l.meaning,
        steps: l.steps,
      },
      published: publishBook,
      promote: publishBook,
      sort: l.book.beyt,
    })),
  ];
}

/**
 * با ردیفی که از قبل هست چه کنیم.
 *
 * بدونِ `--update` هیچ: اجرای دوبارهٔ seed ویرایشِ مدیر را دست نمی‌زند، و
 * وضعیتِ انتشار هم ویرایشِ مدیر است. با `--update`:
 *   • sync — متن یا گام‌ها با فایل فرق دارد (`changed`) و بازنویسی می‌شود.
 *   • publish — پیش‌نویسی که `promote` دارد منتشر می‌شود. هیچ مسیری ردیفِ
 *     منتشرشده را پیش‌نویس نمی‌کند، پس اجرای دوباره چیزی را عوض نمی‌کند.
 */
export function planExisting(
  seed: Pick<Seed, "promote">,
  row: { isPublished: boolean; changed: boolean },
  update: boolean,
): { sync: boolean; publish: boolean } {
  if (!update) return { sync: false, publish: false };
  return { sync: row.changed, publish: seed.promote && !row.isPublished };
}
