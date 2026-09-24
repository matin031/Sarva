import test from "node:test";
import assert from "node:assert/strict";
import { bucketize, type RawAnswer } from "@/lib/plus/skill-buckets";
import {
  MIN_DELTA_EVIDENCE,
  buildTopicMap,
  masteryScore,
  statusOf,
  topic,
  topicDeltas,
  topicsFromSkill,
  type DatedAnswer,
} from "@/lib/plus/topics";

/**
 * قاعده‌های محصولیِ نقشهٔ مبحث‌ها.
 *
 * ⚠️ هر سه چیزی که اینجا آزموده می‌شود، یک شکلِ مشخص از *غلط نشان دادنِ
 * پیشرفت* را جلو می‌گیرد — و دانش‌آموز به این اعداد اعتماد می‌کند.
 */

const DAY = 86_400_000;
const NOW = new Date("2026-09-22T12:00:00Z");

function dated(key: string, correct: number, wrong: number, daysAgo: number): DatedAnswer[] {
  const at = new Date(NOW.getTime() - daysAgo * DAY).toISOString();
  const rows: DatedAnswer[] = [];
  for (let i = 0; i < correct; i++) rows.push({ key, label: key, correct: true, at });
  for (let i = 0; i < wrong; i++) rows.push({ key, label: key, correct: false, at });
  return rows;
}

/* ───────────────────────────── نقشهٔ مبحث‌ها ────────────────────────────── */

test("مبحث‌ها ضعیف‌ترین‌اول مرتب می‌شوند و در تساوی، پرشاهدتر جلوتر است", () => {
  const map = buildTopicMap(
    [
      [
        topic("aruz", "خوب", "خوب", 9, 10, ""),
        topic("aruz", "ضعیف", "ضعیف", 2, 10, ""),
        // همان دقتِ «ضعیف» ولی با شواهدِ بیشتر — باید جلوتر بیاید.
        topic("grammar", "ضعیفِ مطمئن", "ضعیفِ مطمئن", 8, 40, ""),
      ],
    ],
    3,
  );

  assert.deepEqual(
    map.topics.map((t) => t.label),
    ["ضعیفِ مطمئن", "ضعیف", "خوب"],
  );
  assert.equal(map.weak.length, 2);
  assert.equal(map.strong.length, 1);
  assert.equal(map.pending, 3);
  // کلید پیشونددار است تا فردا بشود مبحث را به درسنامه‌اش وصل کرد.
  assert.equal(map.topics[0].key, "grammar:ضعیفِ مطمئن");
});

test("پله‌های وضعیت روی مرزها", () => {
  assert.equal(statusOf(0.54), "weak");
  assert.equal(statusOf(0.55), "fair");
  assert.equal(statusOf(0.79), "fair");
  assert.equal(statusOf(0.8), "strong");
});

test("مهارتی که شواهدِ کافی ندارد هیچ مبحثی نمی‌سازد", () => {
  // سه پاسخ — زیرِ حدِ MIN_EVIDENCE_TOTAL.
  const rows: RawAnswer[] = [
    { key: "فعولن", label: "فعولن", correct: true, source: "پل وزن" },
    { key: "فعولن", label: "فعولن", correct: false, source: "پل وزن" },
    { key: "فعولن", label: "فعولن", correct: false, source: "پل وزن" },
  ];
  assert.deepEqual(topicsFromSkill(bucketize(rows), "aruz"), []);
});

/* ────────────────────────── پیشرفت در هر مبحث ──────────────────────────── */

test("پیشرفت از دو پنجرهٔ هم‌اندازه می‌آید و بر حسب واحدِ درصد است", () => {
  const rows = [
    ...dated("مفاعیلن", 2, 6, 20), // پنجرهٔ قبلی: ۲۵٪
    ...dated("مفاعیلن", 6, 2, 3), // پنجرهٔ اخیر: ۷۵٪
  ];

  const [d] = topicDeltas(rows, "aruz", NOW, 14);
  assert.equal(d.key, "aruz:مفاعیلن");
  assert.equal(d.delta, 50);
  assert.equal(d.beforeN, 8);
  assert.equal(d.afterN, 8);
});

test("مبحثی که در یکی از دو پنجره کم‌شاهد است حذف می‌شود، نه اینکه صفر بگیرد", () => {
  const rows = [
    ...dated("فاعلاتن", 0, MIN_DELTA_EVIDENCE - 1, 20), // کمتر از حد
    ...dated("فاعلاتن", 8, 0, 3),
  ];
  assert.deepEqual(topicDeltas(rows, "aruz", NOW, 14), []);
});

test("پاسخ‌های بیرونِ هر دو پنجره اصلاً شمرده نمی‌شوند", () => {
  const rows = [
    ...dated("مستفعلن", 20, 0, 90), // خیلی قدیمی
    ...dated("مستفعلن", 0, 6, 20),
    ...dated("مستفعلن", 3, 3, 3),
  ];

  const [d] = topicDeltas(rows, "aruz", NOW, 14);
  // اگر ردیف‌های قدیمی وارد می‌شدند، «قبل» ۷۷٪ می‌شد و پیشرفت، افت.
  assert.equal(d.before, 0);
  assert.equal(d.delta, 50);
});

test("افت هم گزارش می‌شود و ترتیب بر اساس بزرگیِ تغییر است", () => {
  const rows = [
    ...dated("الف", 8, 0, 20),
    ...dated("الف", 0, 8, 3), // افتِ ۱۰۰ واحد
    ...dated("ب", 4, 4, 20),
    ...dated("ب", 6, 2, 3), // رشدِ ۲۵ واحد
  ];

  const out = topicDeltas(rows, "aruz", NOW, 14);
  assert.deepEqual(
    out.map((d) => d.delta),
    [-100, 25],
  );
});

/* ─────────────────────────────── شاخصِ تسلط ────────────────────────────── */

test("شاخص تسلط از سه جزء ساخته می‌شود و هر سه گزارش می‌شوند", () => {
  const m = masteryScore({
    correct: 80,
    total: 100,
    strongTopics: 5,
    ratedTopics: 10,
    activeWeeks: 4,
    weeks: 8,
  });

  // ۰٫۸×۵۰ + ۰٫۵×۳۰ + ۰٫۵×۲۰ = ۶۵
  assert.equal(m.score, 65);
  assert.equal(m.level, "در حال پیشرفت");
  assert.equal(m.ready, true);
  assert.deepEqual(
    m.parts.map((p) => p.percent),
    [80, 50, 50],
  );
});

test("بدون مبحثِ سنجیده‌شده، شاخص ساخته می‌شود ولی ready نیست", () => {
  const m = masteryScore({
    correct: 9,
    total: 10,
    strongTopics: 0,
    ratedTopics: 0,
    activeWeeks: 1,
    weeks: 8,
  });
  // ⚠️ دقتِ ۹۰٪ روی ده پاسخ، بدونِ این گارد، «پیشرفته» نشان داده می‌شد.
  assert.equal(m.ready, false);
});

test("استمرار از یک کران بالاتر نمی‌رود", () => {
  const m = masteryScore({
    correct: 10,
    total: 10,
    strongTopics: 2,
    ratedTopics: 2,
    activeWeeks: 12,
    weeks: 8,
  });
  assert.equal(m.score, 100);
});
