import assert from "node:assert/strict";
import test from "node:test";

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { parseBulk } from "../bulk";
import { CONCEPTS, DEMO, DEMO_RIGHT, DEMO_WRONG, DIALOGUE, LEVELS, paletteFor, tokenize, type Level, type Step } from "../content";
import { canPaint, currentStep, initialState, judge, pickLine, reduce, selections, type Action, type Found, type State } from "../game";
import { parseSteps, toLevel, validateVerse, type VerseRecord } from "../verse";
import { BOOK_RAW } from "../../../scripts/rang-ara/book-seed";

const run = (actions: Action[], from: State = initialState, levels: Level[] = LEVELS) =>
  actions.reduce((s, a) => reduce(levels, s, a), from);

/* ── محتوا ─────────────────────────────────────────────────────────────── */

test("هر بیت با داده‌اش سازگار است", () => {
  const ids = new Set<string>();
  for (const level of LEVELS) {
    assert.ok(!ids.has(level.id), `شناسهٔ تکراری: ${level.id}`);
    ids.add(level.id);

    const tokenIds = new Set(level.tokens.map((t) => t.id));
    assert.ok(level.palette.length >= 3 && level.palette.length <= 7, `${level.id}: پالت باید ۳ تا ۷ رنگ باشد`);
    assert.equal(new Set(level.palette).size, level.palette.length, `${level.id}: مفهومِ تکراری در پالت`);
    const colors = level.palette.map((c) => CONCEPTS[c].color);
    assert.equal(new Set(colors).size, colors.length, `${level.id}: دو مفهوم در پالت هم‌رنگ‌اند`);
    assert.ok(level.steps.length > 0, `${level.id}: بدونِ گام`);

    const claimed = new Map<string, number>();
    level.steps.forEach((step, i) => {
      assert.ok(level.palette.includes(step.concept), `${level.id}: «${step.concept}» در پالت نیست`);
      assert.ok(step.explanation.trim(), `${level.id}: گامِ ${i} توضیح ندارد`);
      for (const sel of selections(step)) {
        assert.ok(sel.length > 0, `${level.id}: انتخابِ خالی`);
        for (const id of sel) {
          assert.ok(tokenIds.has(id), `${level.id}: شناسهٔ ناموجود ${id}`);
          /* یک واژه نمی‌تواند با یک آرایه جوابِ دو گام باشد؛ دو آرایهٔ
             مختلف (مجاز در دلِ کنایه) مجاز است. */
          const owner = claimed.get(`${id}:${step.concept}`);
          assert.ok(owner === undefined || owner === i, `${level.id}: ${id} با یک آرایه جوابِ دو گام است`);
          claimed.set(`${id}:${step.concept}`, i);
        }
      }
    });
  }
});

test("جواب‌ها به همان واژه‌هایی اشاره می‌کنند که باید", () => {
  /* نسخهٔ خوانای جواب‌ها؛ اگر کسی متنِ بیتی را عوض کند و شناسه‌ها جابه‌جا
     شوند، اینجا می‌شکند. */
  const text = (level: Level, ids: string[]) =>
    ids.map((id) => level.tokens.find((t) => t.id === id)!.text).join(" ");
  const expected: Record<string, string[]> = {
    "bani-adam": ["بنی‌آدم", "اعضای یک پیکرند"],
    "zaban-kelid": ["زبان", "کلید در گنج صاحب‌هنر"],
    "ma-cho-nay": ["ما", "چو", "ناییم"],
    "derakht-dusti": ["دوستی", "درخت"],
    "abr-o-bad": ["نانی", "ابر"],
    "saghi-jam": ["جام", "خاک بر سر کن"],
    "kenam-palangan": ["کنام پلنگان و شیران شود"],
    "dast-az-jan": ["دست از جان بشوید"],
    "cheshm-yari": ["چشم یاری داشتیم"],
    "bar-danesh": ["دانش", "بار", "به زیر آوری چرخ نیلوفری را"],
    "saba-ghazal": ["صبا", "غزال رعنا", "سر به کوه و بیابان داده‌ای"],
    "rokh-khold": ["لعلت", "رخت", "چون", "خلد"],
    "dust-dast": ["دست دوست"],
    "baran-rahmat": ["رسیده کشیده", "رحمت نعمت", "بی‌حسابش بی‌دریغش"],
  };
  assert.deepEqual(Object.keys(expected).sort(), LEVELS.map((l) => l.id).sort());
  for (const level of LEVELS) {
    assert.deepEqual(
      level.steps.map((s) => text(level, s.answer)),
      expected[level.id],
      level.id,
    );
  }
  // «ما»ی دومِ هر مصراع جواب نیست، هرچند همان متن است.
  const ma = LEVELS.find((l) => l.id === "ma-cho-nay")!;
  assert.equal(judge(ma, [], "mushabbah", "0-6").kind, "wrong");
  assert.equal(judge(ma, [], "mushabbah", "1-0").kind, "correct");
});

test("مجموعه‌های دیالوگ به اندازهٔ کافی متنوع‌اند", () => {
  assert.ok(DIALOGUE.positive.length >= 8);
  assert.ok(DIALOGUE.negative.length >= 8);
  assert.equal(new Set(DIALOGUE.positive).size, DIALOGUE.positive.length);
  assert.equal(new Set(DIALOGUE.negative).size, DIALOGUE.negative.length);
});

test("pickLine هیچ جمله‌ای را پشتِ سرِ هم تکرار نمی‌کند", () => {
  for (const pool of [DIALOGUE.positive, DIALOGUE.noColor, ["تک"]] as (readonly string[])[]) {
    const recent: string[] = [];
    let prev = "";
    for (let i = 0; i < 300; i++) {
      const line = pickLine(pool, recent);
      assert.ok(pool.includes(line));
      if (pool.length > 1) assert.notEqual(line, prev);
      prev = line;
    }
  }
});

/* ── داوری ─────────────────────────────────────────────────────────────── */

test("داوری: درست، رنگِ غلط، واژهٔ غلط، و جوابِ زودتر از نوبت", () => {
  const level = LEVELS.find((l) => l.id === "bani-adam")!;
  assert.deepEqual(judge(level, [], "mushabbah", "0-0"), { kind: "correct", step: 0, tokens: ["0-0"] });
  // کلیک روی هر واژهٔ یک عبارت، کلِ عبارت را رنگ می‌کند.
  assert.deepEqual(judge(level, [], "mushabbahBih", "0-2"), {
    kind: "correct",
    step: 1,
    tokens: ["0-1", "0-2", "0-3"],
  });
  assert.deepEqual(judge(level, [], "mushabbahBih", "0-0"), { kind: "wrong-color", tokens: ["0-0"] });
  assert.deepEqual(judge(level, [], "mushabbah", "1-2"), { kind: "wrong", tokens: ["1-2"] });
  // گامی که پیدا شده دیگر جوابی ندارد.
  const found = [{ step: 0, tokens: ["0-0" as const], strokeId: 1 }];
  assert.equal(judge(level, found, "mushabbah", "0-0").kind, "wrong");
});

/* ── ماشینِ حالت ───────────────────────────────────────────────────────── */

test("یک بیت از اول تا آخر", () => {
  let s = run([{ type: "pick", concept: "mushabbah" }, { type: "paint", token: "0-0" }]);
  assert.equal(s.phase, "checking");
  s = run([{ type: "resolve", id: s.stroke!.id }], s);
  assert.equal(s.phase, "correct");
  s = run([{ type: "settled", id: s.stroke!.id }], s);
  assert.equal(s.phase, "idle");
  assert.equal(s.concept, null, "رنگ بعد از گامِ درست از دست می‌افتد");

  s = run([{ type: "pick", concept: "mushabbahBih" }, { type: "paint", token: "0-3" }], s);
  s = run([{ type: "resolve", id: s.stroke!.id }, { type: "settled", id: s.stroke!.id }], s);
  assert.equal(s.phase, "explanation");
  assert.equal(s.stats.clean, 1);

  s = run([{ type: "next" }, { type: "enter" }], s);
  assert.equal(s.levelIndex, 1);
  assert.equal(s.phase, "idle");
  assert.deepEqual(s.found, []);
});

test("کلیکِ سریع و پیام‌های دیررس چیزی را خراب نمی‌کنند", () => {
  let s = run([{ type: "pick", concept: "kenaye" }, { type: "paint", token: "1-2" }]);
  const first = s.stroke!.id;
  // کلیکِ دوم وسطِ بررسی
  assert.equal(run([{ type: "paint", token: "1-3" }], s), s);
  s = run([{ type: "resolve", id: first }], s);
  assert.equal(s.phase, "wrong");
  // resolveِ تکراری و settledِ بی‌جا
  assert.equal(run([{ type: "resolve", id: first }, { type: "settled", id: first }], s), s);
  // کلیک وسطِ پاک کردن
  s = run([{ type: "wipe", id: first }], s);
  assert.equal(s.phase, "wiping");
  assert.equal(run([{ type: "paint", token: "0-0" }], s), s);
  // عوض کردنِ رنگ وسطِ پاک کردن مجاز است ولی فاز را عوض نمی‌کند
  s = run([{ type: "pick", concept: "mushabbah" }], s);
  assert.equal(s.phase, "wiping");
  assert.equal(s.concept, "mushabbah");
  s = run([{ type: "wiped", id: first }], s);
  assert.equal(s.phase, "color-selected");
  assert.equal(s.stroke, null);
  assert.equal(s.stats.wipes, 1);
  // پایانِ دیررسِ همان پاک کردن
  assert.equal(run([{ type: "wiped", id: first }], s), s);

  // ضربهٔ تازه شناسهٔ تازه می‌گیرد؛ پیامِ ضربهٔ قبلی رویش اثر ندارد.
  s = run([{ type: "paint", token: "0-0" }], s);
  assert.notEqual(s.stroke!.id, first);
  assert.equal(run([{ type: "resolve", id: first }], s), s);
});

test("رنگی که وسطِ جشنِ پاسخِ درست برداشته شده از دست نمی‌رود", () => {
  let s = run([{ type: "pick", concept: "mushabbah" }, { type: "paint", token: "0-0" }]);
  const id = s.stroke!.id;
  s = run([{ type: "resolve", id }, { type: "pick", concept: "mushabbahBih" }, { type: "settled", id }], s);
  assert.equal(s.phase, "color-selected");
  assert.equal(s.concept, "mushabbahBih");
});

test("واژهٔ رنگ‌شده دوباره رنگ نمی‌شود و بدونِ رنگ هم چیزی رنگ نمی‌شود", () => {
  let s = run([{ type: "paint", token: "0-0" }]);
  assert.equal(s, initialState);
  s = run([{ type: "pick", concept: "mushabbah" }, { type: "paint", token: "0-0" }], s);
  s = run([{ type: "resolve", id: s.stroke!.id }, { type: "settled", id: s.stroke!.id }], s);
  const before = run([{ type: "pick", concept: "mushabbahBih" }], s);
  assert.equal(run([{ type: "paint", token: "0-0" }], before), before);
});

test("بعد از آخرین بیت بازی تمام می‌شود و از نو شروع می‌شود", () => {
  const one = [LEVELS[0]];
  let s = run(
    [{ type: "pick", concept: "mushabbah" }, { type: "paint", token: "0-0" }],
    initialState,
    one,
  );
  s = run([{ type: "resolve", id: s.stroke!.id }, { type: "settled", id: s.stroke!.id }], s, one);
  s = run([{ type: "pick", concept: "mushabbahBih" }, { type: "paint", token: "0-1" }], s, one);
  s = run([{ type: "resolve", id: s.stroke!.id }, { type: "settled", id: s.stroke!.id }], s, one);
  s = run([{ type: "next" }, { type: "enter" }], s, one);
  assert.equal(s.phase, "finished");
  s = run([{ type: "restart" }], s, one);
  assert.equal(s.phase, "idle");
  assert.equal(s.levelIndex, 0);
  assert.ok(s.strokeSeq > 0, "شناسهٔ ضربه‌ها بعد از شروعِ دوباره تکرار نمی‌شود");
});

/* ── بانکِ بیت‌ها ─────────────────────────────────────────────────────── */

const verse = (patch: Partial<VerseRecord> = {}): VerseRecord => ({
  id: "00000000-0000-0000-0000-000000000000",
  grade: "dahom",
  lesson: 5,
  poet: "سیف فرغانی",
  source: null,
  lines: ["وین بوم محنت از پی آن تا کند خراب", "بر دولت آشیان شما نیز بگذرد"],
  meaning: null,
  steps: [
    { concept: "mushabbah", answer: ["0-2"], explanation: "محنت به بوم مانند شده." },
    { concept: "mushabbahBih", answer: ["0-1"], explanation: "بوم مشبّه‌به است." },
  ],
  ...patch,
});

test("اعتبارسنجیِ بیت همان چیزی را رد می‌کند که بازی را خراب می‌کرد", () => {
  assert.equal(validateVerse(verse()), null);
  assert.match(validateVerse(verse({ lesson: null }))!, /درس/);
  assert.match(validateVerse(verse({ grade: null }))!, /خارج از کتاب/);
  assert.equal(validateVerse(verse({ grade: null, lesson: null })), null);
  assert.match(validateVerse(verse({ lesson: 19 }))!, /درس/);
  // درس‌های آزاد: ۴ هر پایه، ۱۵ دهم، ۱۳ یازدهم، ۱۵ دوازدهم
  for (const [grade, lesson] of [["dahom", 4], ["dahom", 15], ["yazdahom", 13], ["davazdahom", 15]] as const) {
    assert.match(validateVerse(verse({ grade, lesson }))!, /آزاد/);
  }
  assert.equal(validateVerse(verse({ grade: "yazdahom", lesson: 15 })), null);
  assert.match(validateVerse(verse({ lines: ["", "x"] }))!, /مصراع/);
  assert.match(validateVerse(verse({ steps: [] }))!, /آرایه/);
  // شناسه‌ای که در بیت نیست (مثلاً بعد از عوض شدنِ متن)
  assert.match(
    validateVerse(verse({ steps: [{ concept: "kenaye", answer: ["0-40"], explanation: "x" }] }))!,
    /دوباره انتخاب/,
  );
  // یک واژه با یک آرایه جوابِ دو گام: داوری نمی‌داند ضربه مالِ کدام است
  assert.match(
    validateVerse(
      verse({
        steps: [
          { concept: "kenaye", answer: ["0-2"], explanation: "x" },
          { concept: "kenaye", answer: ["0-3"], accepted: [["0-2"]], explanation: "y" },
        ],
      }),
    )!,
    /با همین آرایه/,
  );
  // دو آرایهٔ مختلف روی یک واژه (مجاز در دلِ کنایه) درست است
  assert.equal(
    validateVerse(
      verse({
        steps: [
          { concept: "majaz", answer: ["0-2"], explanation: "x" },
          { concept: "kenaye", answer: ["0-1", "0-2", "0-3"], explanation: "y" },
        ],
      }),
    ),
    null,
  );
  assert.match(validateVerse(verse({ steps: [{ concept: "mushabbah", answer: ["0-2"], explanation: " " }] }))!, /توضیح/);
});

test("ردیفِ دیتابیس به مرحلهٔ بازی تبدیل می‌شود و ردیفِ خراب کنار می‌رود", () => {
  const level = toLevel(verse())!;
  assert.equal(level.book?.lesson, 5);
  assert.equal(level.source, "درس ۵ · بیداد ظالمان");
  assert.deepEqual(level.palette.slice(0, 2), ["mushabbah", "mushabbahBih"]);
  assert.ok(level.palette.length >= 5);
  assert.equal(toLevel(verse({ steps: [] })), null);
  // JSONِ خامِ MariaDB (رشته) و آشغالِ داخلش
  const parsed = parseSteps(JSON.stringify([{ concept: "majaz", answer: ["0-1", "x", 3], explanation: "e" }, 7]));
  assert.deepEqual(parsed, [{ concept: "majaz", answer: ["0-1"], explanation: "e" }]);
  assert.deepEqual(parseSteps("not json"), []);
});

test("علامت‌های نگارشی از واژه جدا می‌شوند ولی شناسه‌ها عوض نمی‌شوند", () => {
  const tokens = tokenize(["«ای دلیر", "غلغله‌زن، چهره‌نما، تیزپا"]);
  assert.deepEqual(
    tokens.map((t) => [t.id, t.pre ?? "", t.text, t.post ?? ""]),
    [
      ["0-0", "«", "ای", ""],
      ["0-1", "", "دلیر", ""],
      ["1-0", "", "غلغله‌زن", "،"],
      ["1-1", "", "چهره‌نما", "،"],
      ["1-2", "", "تیزپا", ""],
    ],
  );
});

test("بیت‌های seedِ کتاب با متنِ درسنامه یکی‌اند و همه معتبرند", async () => {
  const dir = join(process.cwd(), "lib", "doroos", "content");
  const files = new Set(readdirSync(dir));
  for (const raw of BOOK_RAW) {
    const file = raw.id.replace(/-\d+$/, "") + ".ts";
    assert.ok(files.has(file), `${raw.id}: درس پیدا نشد`);
    const lesson = (await import(pathToFileURL(join(dir, file)).href)).default;
    const beyt = lesson.beyts.find((b: { n: number }) => b.n === raw.book.beyt);
    assert.ok(beyt, `${raw.id}: بیت پیدا نشد`);
    assert.deepEqual(raw.lines, beyt.hemistichs, `${raw.id}: متنِ بیت با درسنامه فرق دارد`);
    assert.equal(raw.book.grade, lesson.grade);
    assert.equal(raw.book.lesson, lesson.number);
    const problem = validateVerse({
      grade: raw.book.grade,
      lesson: raw.book.lesson,
      poet: raw.poet,
      source: null,
      lines: [raw.lines[0], raw.lines[1]],
      meaning: raw.meaning,
      steps: raw.steps,
    });
    assert.equal(problem, null, `${raw.id}: ${problem}`);
  }
});

test("بیتِ آموزش: «سرو» استعاره است", () => {
  const word = (id: string) => DEMO.tokens.find((t) => t.id === id)?.text;
  assert.equal(word(DEMO_RIGHT), "سرو");
  assert.equal(word(DEMO_WRONG), "سمن");
  assert.equal(judge(DEMO, [], "esteare", DEMO_RIGHT).kind, "correct");
  assert.equal(judge(DEMO, [], "esteare", DEMO_WRONG).kind, "wrong");
  assert.equal(validateVerse({ ...DEMO, grade: null, lesson: null, source: null, meaning: null }), null);
});

/* ── افزودنِ انبوه ─────────────────────────────────────────────────────── */

test("افزودنِ انبوه: هر دو شکلِ سطرِ آرایه، سرتیتر، واژهٔ تکراری و جوابِ دیگر", () => {
  const text = [
    "# دهم، درس ۵",
    "سرو چمان من چرا میل چمن نمی‌کند / همدم گل نمی‌شود یاد سمن نمی‌کند",
    "شاعر: حافظ",
    "سرو: استعاره | «سرو» استعاره از معشوق است.",
    "کنایه: میل چمن نمی کند؛ چمن | میل نکردن | نکته: یک نکته",
    "",
    "ما چو ناییم و نوا در ما ز توست",
    "ما چو کوهیم و صدا در ما ز توست",
    "مشبه: ما#۲ | ما همان نای است.",
    "",
    "# خارج از کتاب",
    "بنی‌آدم اعضای یکدیگرند / که در آفرینش ز یک گوهرند",
    "منبع: گلستان",
    "مشبه: بنی آدم",
    "",
    "# دهم، درس ۴",
    "الف / ب",
  ].join("\r\n");
  const { items, errors } = parseBulk(text, null);

  assert.equal(errors.length, 1);
  assert.match(errors[0], /آزاد/);
  assert.equal(items.length, 4);

  const [hafez, nay, outside, orphan] = items;
  assert.equal(hafez.error, null);
  assert.equal(hafez.problem, null);
  assert.deepEqual([hafez.verse.grade, hafez.verse.lesson, hafez.verse.poet], ["dahom", 5, "حافظ"]);
  assert.deepEqual(hafez.verse.steps[0], { concept: "esteare", answer: ["0-0"], explanation: "«سرو» استعاره از معشوق است." });
  assert.deepEqual(hafez.verse.steps[1].answer, ["0-4", "0-5", "0-6"]);
  assert.deepEqual(hafez.verse.steps[1].accepted, [["0-5"]]);
  assert.equal(hafez.verse.steps[1].tip, "یک نکته");

  assert.deepEqual(nay.verse.lines, ["ما چو ناییم و نوا در ما ز توست", "ما چو کوهیم و صدا در ما ز توست"]);
  assert.deepEqual(nay.verse.steps[0].answer, ["0-6"]);

  // بی‌توضیح: خطا نیست، پیش‌نویس می‌شود
  assert.equal(outside.error, null);
  assert.match(outside.problem!, /توضیح/);
  assert.deepEqual([outside.verse.grade, outside.verse.lesson, outside.verse.source], [null, null, "گلستان"]);
  assert.deepEqual(outside.verse.steps[0].answer, ["0-0"]);

  assert.match(orphan.error!, /سرتیتر/);
});

test("افزودنِ انبوه: خطاهایی که جلوی ذخیره را می‌گیرند", () => {
  const { items } = parseBulk(
    [
      "الف ب / پ ت",
      "مجاز: الف | x",
      "",
      "الف  ب / پ‌ت",
      "مجاز: الف | x",
      "",
      "الف ب / ج د",
      "مجاز: ژ | x",
      "",
      "فقط یک مصراع",
      "شاعر: کسی",
      "",
      "الف ب / ج ه",
      "وزن: الف",
    ].join("\n"),
    { grade: "davazdahom", lesson: 2 },
  );
  assert.equal(items[0].error, null);
  assert.match(items[1].error!, /تکراری/);
  assert.match(items[2].error!, /پیدا نشد/);
  assert.match(items[3].error!, /دو مصراع/);
  assert.match(items[4].error!, /شناخته نشد/);
});

/* ── جناس و سجع ─────────────────────────────────────────────────────────── */

const pairLevel = (id: string) => LEVELS.find((l) => l.id === id)!;

test("جناس: هر واژه جدا رنگ می‌شود و لنگهٔ اشتباه «جفتش نیست» است", () => {
  const l = pairLevel("dust-dast");
  assert.deepEqual(judge(l, [], "jenas", "0-0"), { kind: "correct", step: 0, tokens: ["0-0"], partial: true });
  const half: Found[] = [{ step: 0, tokens: ["0-0"], strokeId: 1 }];
  assert.equal(currentStep(l, half), 0, "نیمهٔ جفت گام را تمام نمی‌کند");
  // «دوست» و «دوست» تکرار است، نه جناس
  assert.deepEqual(judge(l, half, "jenas", "0-6"), { kind: "wrong-pair", step: 0, tokens: ["0-6"] });
  assert.deepEqual(judge(l, half, "jenas", "0-5"), { kind: "correct", step: 0, tokens: ["0-5"] });
  assert.equal(currentStep(l, [...half, { step: 0, tokens: ["0-5"], strokeId: 2 }]), -1);
  // «دست» اول: هر دو «دوست» لنگه‌اش می‌شوند
  const dast: Found[] = [{ step: 0, tokens: ["0-5"], strokeId: 1 }];
  assert.equal(judge(l, dast, "jenas", "0-6").kind, "correct");
  assert.equal(judge(l, dast, "jenas", "0-0").kind, "correct");
  // رنگِ دیگر روی واژهٔ جناس همان «رنگش نه» است
  assert.equal(judge(l, [], "kenaye", "0-5").kind, "wrong-color");
});

test("سجع: تا یک جفت نیمه‌کاره است، واژهٔ جفتِ دیگر پذیرفته نمی‌شود", () => {
  const l = pairLevel("baran-rahmat");
  const v = judge(l, [], "saj", "0-1"); // «رحمت»
  assert.deepEqual(v, { kind: "correct", step: 1, tokens: ["0-1"], partial: true });
  const half: Found[] = [{ step: 1, tokens: ["0-1"], strokeId: 1 }];
  assert.deepEqual(judge(l, half, "saj", "1-6"), { kind: "wrong-pair", step: 1, tokens: ["1-6"] }); // «کشیده»
  assert.deepEqual(judge(l, half, "saj", "1-2"), { kind: "correct", step: 1, tokens: ["1-2"] }); // «نعمت»
});

test("ماشینِ حالت: نیمهٔ جفت رنگ را در دست نگه می‌دارد و آرایه یک بار شمرده می‌شود", () => {
  const levels = [pairLevel("dust-dast")];
  let s = run([{ type: "pick", concept: "jenas" }, { type: "paint", token: "0-5" }, { type: "resolve", id: 1 }], initialState, levels);
  assert.equal(s.phase, "correct");
  assert.equal(s.stats.found, 0);
  s = run([{ type: "settled", id: 1 }], s, levels);
  assert.equal(s.phase, "color-selected");
  assert.equal(s.concept, "jenas");
  s = run([{ type: "paint", token: "0-6" }, { type: "resolve", id: 2 }], s, levels);
  assert.equal(s.stats.found, 1);
  s = run([{ type: "settled", id: 2 }], s, levels);
  assert.equal(s.phase, "explanation");
});

test("ثبتِ نتیجه: لنگهٔ اشتباه به حسابِ همان جفت", async () => {
  const { scoreVersePlay } = await import("../record");
  const out = scoreVersePlay(pairLevel("dust-dast"), [
    { concept: "jenas", token: "0-0" },
    { concept: "jenas", token: "0-6" },
    { concept: "jenas", token: "0-5" },
  ]);
  assert.deepEqual(out, [{ step: 0, concept: "jenas", mistakes: 1 }]);
  // نیمهٔ جفت بیت را تمام نمی‌کند
  assert.equal(scoreVersePlay(pairLevel("dust-dast"), [{ concept: "jenas", token: "0-0" }]), null);
});

test("جناس و سجع دست‌کم دو واژه می‌خواهند؛ افزودنِ انبوه با «+» یا واژه‌های جدا", () => {
  assert.match(
    validateVerse(verse({ steps: [{ concept: "jenas", answer: ["0-1"], explanation: "x" }] }))!,
    /دو واژه/,
  );
  const { items } = parseBulk(
    [
      "دوست آن باشد که گیرد دست دوست / در پریشان‌حالی و درماندگی",
      "جناس: دست + دوست#۲ | x",
      "",
      "باران رحمت بی‌حسابش همه را رسیده / و خوان نعمت بی‌دریغش همه جا کشیده",
      "سجع: رسیده کشیده | x",
    ].join("\n"),
    null,
  );
  assert.deepEqual(items[0].verse.steps[0].answer, ["0-5", "0-6"]);
  assert.equal(items[0].problem, null);
  assert.deepEqual(items[1].verse.steps[0].answer, ["0-5", "1-6"]);
});

/* ── آرایهٔ تودرتو: مجاز در دلِ کنایه ─────────────────────────────────────── */

const nestedSteps: Step[] = [
  { concept: "kenaye", answer: ["0-4", "0-5", "0-6"], explanation: "کنایه" },
  { concept: "majaz", answer: ["0-4"], explanation: "مجاز" },
];
const nestedLines: [string, string] = ["گفت: «آگه نیستی کز سر درافتادت کلاه»", "گفت: «در سر عقل باید، بی‌کلاهی عار نیست»"];
const nested: Level = {
  id: "nested",
  poet: "پروین اعتصامی",
  lines: nestedLines,
  tokens: tokenize(nestedLines),
  palette: paletteFor(nestedSteps),
  steps: nestedSteps,
};

test("مجاز در دلِ کنایه: واژهٔ رنگ‌شده تا آرایهٔ دیگرش پیدا نشده رنگ می‌پذیرد", () => {
  const majaz: Found[] = [{ step: 1, tokens: ["0-4"], strokeId: 1 }];
  assert.equal(canPaint(nested, majaz, "0-4"), true, "کنایه هنوز «سر» را می‌خواهد");
  assert.deepEqual(judge(nested, majaz, "kenaye", "0-4"), { kind: "correct", step: 0, tokens: ["0-4", "0-5", "0-6"] });
  // رنگِ غلط روی همان واژه: واژه درست است، رنگ نه
  assert.equal(judge(nested, majaz, "esteare", "0-4").kind, "wrong-color");

  const both: Found[] = [...majaz, { step: 0, tokens: ["0-4", "0-5", "0-6"], strokeId: 2 }];
  assert.equal(canPaint(nested, both, "0-4"), false);
  assert.equal(canPaint(nested, both, "0-5"), false);

  // ترتیبِ برعکس: اول کنایه، بعد مجاز
  const kenaye: Found[] = [{ step: 0, tokens: ["0-4", "0-5", "0-6"], strokeId: 1 }];
  assert.equal(canPaint(nested, kenaye, "0-4"), true);
  assert.equal(canPaint(nested, kenaye, "0-5"), false, "«درافتادت» فقط جوابِ کنایه بود");
  assert.deepEqual(judge(nested, kenaye, "majaz", "0-4"), { kind: "correct", step: 1, tokens: ["0-4"] });
});

test("مجاز در دلِ کنایه: ماشینِ حالت و ثبتِ نتیجه", async () => {
  const levels = [nested];
  let s = run(
    [
      { type: "pick", concept: "majaz" },
      { type: "paint", token: "0-4" },
      { type: "resolve", id: 1 },
      { type: "settled", id: 1 },
      { type: "pick", concept: "kenaye" },
      { type: "paint", token: "0-4" },
    ],
    initialState,
    levels,
  );
  assert.equal(s.phase, "checking", "واژهٔ رنگ‌شده دوباره پذیرفته شد");
  s = run([{ type: "resolve", id: 2 }, { type: "settled", id: 2 }], s, levels);
  assert.equal(s.phase, "explanation");

  const { scoreVersePlay } = await import("../record");
  assert.deepEqual(
    scoreVersePlay(nested, [
      { concept: "majaz", token: "0-4" },
      { concept: "kenaye", token: "0-4" },
    ])?.map((r) => r.mistakes),
    [0, 0],
  );
});
