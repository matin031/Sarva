import test from "node:test";
import assert from "node:assert/strict";
import {
  ARRIVAL_Z,
  BOOK_HEIGHT,
  BOOK_WIDTH,
  CHARACTER_HEIGHT,
  LOGO_CENTER_Y,
  LOGO_HEIGHT,
  SHELF_Y,
  WALL_HEIGHT,
  bookSlots,
  frameFor,
} from "../../lib/poets-shelf/layout";
import { buildRound, poetsShelfContent } from "../../lib/poets-shelf/questions";

/* ═══════════════════════════════════════════════════════════════════════════
   قیدهایی که اگر بشکنند، بازی *خراب* نمی‌شود بلکه بی‌سروصدا غلط می‌شود.
   ═══════════════════════════════════════════════════════════════════════════

   اینها همان چیزهایی‌اند که در مرورگر فقط با نگاه‌کردن دیده می‌شوند و آن هم
   نه همیشه: کتابی که در گوشیِ عمودی نیم‌سانت بیرونِ کادر است، یا دو گزینه
   که هر دو از یک شاعرند و بازیکن هرگز نمی‌فهمد چرا پاسخش «غلط» بود.
   ═══════════════════════════════════════════════════════════════════════════ */

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test("هر دور دقیقاً یک پاسخِ درست دارد", () => {
  for (let seed = 1; seed <= 300; seed++) {
    const round = buildRound({ optionCount: 5, rng: seededRng(seed) });
    const correct = round.options.filter((o) => o.correct);
    assert.equal(correct.length, 1, `بذر ${seed}: باید دقیقاً یک پاسخِ درست باشد`);
    assert.equal(correct[0].work.id, round.answer.id);
    assert.equal(correct[0].work.authorId, round.author.id);
  }
});

test("⚠️ هیچ گزینهٔ نادرستی از همان پدیدآورنده نیست", () => {
  /* این مهم‌ترین قیدِ محتوایی است. مولوی سه اثر در فهرست دارد؛ اگر
     گزینه‌ها بر اساسِ *اثر* کنار گذاشته می‌شدند و نه بر اساسِ
     *پدیدآورنده*، دورِ مولوی می‌توانست هم «مثنوی» و هم «دیوان شمس» را
     نشان بدهد — دو پاسخِ درست، که یکی‌شان غلط شمرده می‌شد. */
  for (let seed = 1; seed <= 300; seed++) {
    const round = buildRound({ optionCount: 5, rng: seededRng(seed) });
    const wrong = round.options.filter((o) => !o.correct);
    for (const option of wrong) {
      assert.notEqual(
        option.work.authorId,
        round.author.id,
        `بذر ${seed}: «${option.work.title}» هم از ${round.author.name} است`,
      );
    }
  }
});

test("گزینه‌ها تکراری نیستند", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const round = buildRound({ optionCount: 5, rng: seededRng(seed) });
    const ids = new Set(round.options.map((o) => o.work.id));
    assert.equal(ids.size, round.options.length, `بذر ${seed}: گزینهٔ تکراری دارد`);
  }
});

test("هر اثر به یک پدیدآورندهٔ موجود اشاره می‌کند", () => {
  const known = new Set(poetsShelfContent.authors.map((a) => a.id));
  for (const work of poetsShelfContent.works) {
    assert.ok(known.has(work.authorId), `«${work.title}» به پدیدآورندهٔ ناشناخته «${work.authorId}» اشاره دارد`);
  }
});

test("پرهیز از تکرار، ساختِ دور را متوقف نمی‌کند", () => {
  /* حتی اگر *همهٔ* پدیدآورنده‌ها تازه آمده باشند، باز هم باید دوری ساخته
     شود. یک بازیِ تکراری از یک بازیِ متوقف بهتر است. */
  const everyone = poetsShelfContent.authors.map((a) => a.id);
  const round = buildRound({ optionCount: 5, rng: seededRng(5), avoidAuthorIds: everyone });
  assert.equal(round.options.length, 5);
});

test("لنگرِ رسیدن همیشه زیرِ همان کتاب است", () => {
  for (const count of [3, 4, 5, 6]) {
    const slots = bookSlots(count, 0.9);
    for (const slot of slots) {
      assert.equal(slot.arrival[0], slot.position[0], "x لنگر باید با x کتاب یکی باشد");
      assert.equal(slot.arrival[1], 0, "لنگر باید روی کف باشد");
      assert.equal(slot.arrival[2], ARRIVAL_Z);
      assert.equal(slot.label[0], slot.position[0], "برچسب باید بالای همان کتاب باشد");
      assert.ok(slot.label[1] > slot.position[1] + BOOK_HEIGHT, "برچسب باید بالای کتاب بنشیند");
    }
  }
});

test("⚠️ ناحیه‌های لمسِ همسایه هرگز روی هم نمی‌افتند", () => {
  /* همان درسی که در `AnswerHitTarget`ِ پلِ وزن گرفته شد: اگر دو ناحیه
     هم‌پوشانی داشته باشند، «کدام کتاب را زدم» به ترتیبِ پرتوافکنی بستگی
     پیدا می‌کند و بازیکن گاهی کتابِ کناری را انتخاب می‌کند. */
  for (const count of [3, 4, 5, 6, 7]) {
    for (const spacing of [0.55, 0.7, 0.85, 0.98]) {
      const slots = bookSlots(count, spacing);
      for (let i = 1; i < slots.length; i++) {
        const left = slots[i - 1];
        const right = slots[i];
        const gap = right.position[0] - left.position[0] - (left.hitSize[0] + right.hitSize[0]) / 2;
        assert.ok(gap > 0, `count=${count} spacing=${spacing}: ناحیه‌ها ${gap.toFixed(3)} هم‌پوشانی دارند`);
      }
    }
  }
});

test("⚠️ در هر نسبتِ تصویر، همهٔ کتاب‌ها و نشان در کادر می‌مانند", () => {
  /* از گوشیِ باریکِ عمودی تا نمایشگرِ فوق‌عریض. */
  for (const aspect of [0.5, 0.6, 0.75, 1, 4 / 3, 1.6, 16 / 9, 2.2]) {
    const frame = frameFor(aspect, 5);
    const slots = bookSlots(5, frame.spacing);

    // افقی: لبهٔ بیرونیِ دورترین کتاب باید درونِ پهنای دیدنی باشد.
    const outermost = Math.max(...slots.map((s) => Math.abs(s.position[0]))) + BOOK_WIDTH / 2;
    assert.ok(
      outermost < frame.visibleWidth / 2,
      `نسبت ${aspect.toFixed(2)}: کتابِ کناری تا ${outermost.toFixed(2)} می‌رود ولی نیمهٔ کادر ${(frame.visibleWidth / 2).toFixed(2)} است`,
    );

    // عمودی: بالای نشان باید زیرِ لبهٔ بالای کادر بماند.
    const halfHeight = frame.visibleWidth / 2 / aspect;
    const topVisible = frame.cameraTarget[1] + halfHeight;
    assert.ok(
      LOGO_CENTER_Y + LOGO_HEIGHT / 2 < topVisible,
      `نسبت ${aspect.toFixed(2)}: نشان از بالای کادر بیرون می‌زند`,
    );

    // و دیوار باید از بالاترین نقطهٔ دیدنی بلندتر باشد، وگرنه لبه‌اش لو می‌رود.
    assert.ok(
      WALL_HEIGHT > topVisible,
      `نسبت ${aspect.toFixed(2)}: لبهٔ بالای دیوار دیده می‌شود (${topVisible.toFixed(2)} > ${WALL_HEIGHT})`,
    );
  }
});

test("طاقچه بالاتر از فرقِ سرِ شخصیت است", () => {
  /* اگر این بشکند، «کتاب از بالا روی سرش می‌افتد» بی‌معنا می‌شود. */
  assert.ok(SHELF_Y > CHARACTER_HEIGHT, "کفِ کتاب باید بالاتر از سرِ شخصیت باشد");
});
