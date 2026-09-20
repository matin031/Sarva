import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* ═══════════════════════════════════════════════════════════════════════════
   نگهبانِ متنیِ لایهٔ SQL — و صادقانه بگویم چه چیزی را **نمی‌سنجد**.
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ این فایل جایگزینِ یک تستِ واقعی با دیتابیس **نیست** و وانمود هم
   نمی‌کند که هست.

   هیچ تستی در این مخزن به دیتابیس وصل نمی‌شود — نه فقط کیمیا، هیچ‌کدام.
   الگوی پروژه این است که تصمیم‌ها را خالص بیرون بکشد (`round-state.ts`,
   `skill-buckets.ts`, `aruz-bridge/machine.ts`) و همان‌ها را بسنجد. آن
   کار اینجا هم شده و `round-state.test.ts` همهٔ ترکیب‌های تصمیم را
   می‌پوشاند.

   ولی سه تضمین می‌مانند که *فقط* در خودِ SQL زندگی می‌کنند:

     • `for update` — بدونش دو تبِ باز هم‌زمان هر دو خودشان را «تلاشِ
       اول» می‌بینند
     • `attempts_count < ?` در `where` — لایهٔ دومِ سقف، برای روزی که
       کسی قفل را بردارد
     • `revealed_at is null` در هر دو `update` — بی‌اثر بودنِ ثبتِ دوباره

   آن‌ها را نمی‌شود بدونِ MariaDB *اجرا* کرد، ولی می‌شود مطمئن شد که
   **نوشته شده‌اند**. حذفِ تصادفیِ یکی از این سه (مثلاً هنگامِ مرتب کردنِ
   یک کوئری) بی‌صدا‌ترین باگِ ممکن است: همه‌چیز کار می‌کند تا روزی که دو
   درخواست هم‌زمان برسند.

   پس این تست یک *قفلِ متنی* است روی سه رشته‌ای که نباید ناپدید شوند، و
   کارِ واقعیِ سنجش را به تستِ دستی روی dev واگذار می‌کند. هزینه‌اش نزدیکِ
   صفر است و چیزی که می‌گیرد واقعی است.
   ═══════════════════════════════════════════════════════════════════════════ */

const ROOT = process.cwd();
const rounds = readFileSync(join(ROOT, "lib/kimia/server/rounds.ts"), "utf8");
const migrationRaw = readFileSync(join(ROOT, "mysql-migrations/019_kimia_reveal.sql"), "utf8");

/**
 * فقط دستورها، بدونِ کامنت.
 *
 * ⚠️ لازم شد و اتفاقی نیست: کامنتِ بالای مهاجرت *دربارهٔ* چیزهایی حرف
 * می‌زند که نباید در خودِ SQL باشند — «چرا `DROP CONSTRAINT` نزدیم»،
 * «چرا `status = 'revealed'` نشد»، «چرا `CHECK (attempts_count <= 3)`
 * نگذاشتیم». هر سه assert اول با همان توضیح‌ها قرمز شدند.
 *
 * همان دامی که یک بار مهاجرت ۰۱۶ در آن افتاد (توضیحش در خودِ آن فایل
 * هست). آنجا راهِ حل «متن را عوض کن» بود چون آزمونْ سراسری است و باید
 * سخت‌گیر بماند؛ اینجا که آزمون مالِ خودِ همین feature است، درست‌تر آن
 * است که آزمون دستورها را از توضیح‌ها جدا کند و توضیح آزاد بماند.
 */
const migration = migrationRaw
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n");

/**
 * بدنهٔ یک تابع: از نامش تا اعلانِ صادرشدهٔ بعدی.
 *
 * ⚠️ نسخهٔ اول تا اولین `\n}` می‌برید و غلط بود: امضای این توابع یک شیءِ
 * درون‌خطی می‌گیرد و `}): Promise<…>` هم یک `}` در ستونِ صفر دارد، پس
 * بدنه تقریباً خالی می‌شد و *همهٔ* assertها بی‌صدا رد می‌شدند — یعنی
 * نگهبانی که هیچ‌وقت نگهبانی نمی‌کرد.
 */
function bodyOf(name: string): string {
  const start = rounds.indexOf(`export async function ${name}`);
  assert.notEqual(start, -1, `تابع ${name} پیدا نشد`);
  const next = rounds.indexOf("\nexport ", start + 1);
  const body = rounds.slice(start, next === -1 ? undefined : next);
  assert.ok(body.length > 400, `بدنهٔ ${name} خیلی کوتاه است — استخراج شکسته`);
  return body;
}

describe("لایهٔ SQLِ سه تلاش و نمایشِ پاسخ", () => {
  test("هر دو تابعِ نویسنده ردیف را قفل می‌کنند", () => {
    for (const fn of ["recordAttempt", "revealRound"]) {
      assert.match(bodyOf(fn), /for update/i, `${fn} بدونِ قفل می‌خوانَد`);
    }
  });

  test("UPDATEِ تلاشِ بعدی، سقف را در where هم تکرار می‌کند", () => {
    const body = bodyOf("recordAttempt");
    assert.match(
      body,
      /attempts_count\s*<\s*\?/,
      "لایهٔ دومِ سقف از where حذف شده",
    );
    assert.match(
      body,
      /revealed_at\s+is\s+null/,
      "تلاش بعد از «نمایش پاسخ» در where بسته نشده",
    );
  });

  test("«نمایش پاسخ» فقط ردیفِ باز‌نشده و تلاش‌کرده را می‌نویسد", () => {
    const body = bodyOf("revealRound");
    assert.match(body, /revealed_at\s+is\s+null/, "ثبتِ دوباره بسته نشده");
    assert.match(body, /attempts_count\s*>\s*0/, "شرطِ «دست‌کم یک تلاش» در where نیست");
    assert.match(body, /reveal_reason\s*=\s*'user'/, "علتِ ثبت‌شده user نیست");
  });

  test("⚠️ `status` هیچ‌جا مقدارِ سوم نمی‌گیرد", () => {
    /* دو CHECKِ مهاجرت ۰۱۸ می‌گویند `completed` یعنی `last_correct = 1`.
       هر `status = 'revealed'`ی همان‌جا درج را می‌شکند. */
    assert.doesNotMatch(rounds, /status\s*=\s*'revealed'/);
    assert.doesNotMatch(migration, /'revealed'/);
  });

  test("زمان‌ها ساعتِ دیتابیس‌اند و نه ساعتِ Node", () => {
    /* قراردادِ `docs/time-contract.md`: در یک جدول یا همه‌چیز ساعتِ
       دیتابیس است یا همه ساعتِ Node. `started_at`/`answered_at` از
       ۰۱۸ ساعتِ دیتابیس‌اند. */
    const body = bodyOf("revealRound");
    assert.match(body, /revealed_at\s*=\s*now\(6\)/);
    assert.doesNotMatch(body, /new Date\(/);
  });

  test("مهاجرت ۰۱۹ فقط افزودنی است", () => {
    assert.match(migration, /ADD COLUMN `revealed_at`/);
    assert.match(migration, /ADD COLUMN `reveal_reason`/);
    /* هیچ قیدِ موجودی برداشته نمی‌شود — همان چیزی که «راهِ الف» را
       ممکن کرد. */
    assert.doesNotMatch(migration, /\bdrop\s+(constraint|check|index)\b/i);
    assert.doesNotMatch(migration, /\balter\s+table[^;]*\bmodify\b/i);
  });

  test("سه قیدِ تازه در مهاجرت هستند", () => {
    for (const name of [
      "kimia_rounds_reveal_matches",
      "kimia_rounds_reveal_reason_check",
      "kimia_rounds_reveal_needs_attempt",
    ]) {
      assert.match(migration, new RegExp(name), `قیدِ ${name} نیست`);
    }
  });

  test("سقفِ تلاش در دیتابیس CHECK نشده — عمدی و مستند", () => {
    /* اگر روزی کسی وسوسه شود، این تست و کامنتِ بالای مهاجرت با هم
       می‌گویند چرا نه: «سه تلاش» قاعدهٔ محصولی است و ردیف‌های تاریخی را
       گروگان می‌گیرد. */
    assert.doesNotMatch(migration, /attempts_count\s*<=\s*\d/);
  });

  test("سقف از پیکربندی می‌آید و نه از یک عددِ درون‌خطی", () => {
    /* دو عددِ «۳» در دو فایل، دیر یا زود از هم دور می‌شوند. */
    assert.match(rounds, /MAX_ATTEMPTS/);
    assert.doesNotMatch(bodyOf("recordAttempt"), /attempts_count\s*<\s*3\b/);
  });
});
