import test from "node:test";
import assert from "node:assert/strict";
import { resolveCoverage, type CoverageRow } from "@/lib/plus/coverage";

/**
 * زنجیرهٔ پیوستهٔ دسترسی.
 *
 * ⚠️ این تست‌ها بعد از یک باگِ واقعی نوشته شدند: کاربری که دو دورهٔ
 * پشت‌سرهم خریده بود، «۳۰ روز باقی‌مانده» می‌دید در حالی که ۶۰ روز خریده
 * بود — و هشدارِ «نزدیک پایان» هم زودتر شلیک می‌شد، یعنی همان کاربر ممکن بود
 * دوباره پول بدهد.
 */

const T0 = Date.parse("2026-01-01T00:00:00.000Z");
const DAY = 86_400_000;
const at = (days: number) => new Date(T0 + days * DAY).toISOString();
const now = new Date(T0);

function row(from: number, to: number | null, source: "purchase" | "manual_grant" = "purchase"): CoverageRow {
  return { startsAt: at(from), endsAt: to === null ? null : at(to), source };
}

test("بدون هیچ دسترسی، فعال نیست", () => {
  assert.deepEqual(resolveCoverage([], now), { active: false });
});

test("یک دورهٔ جاری", () => {
  const result = resolveCoverage([row(0, 30)], now);
  assert.equal(result.active, true);
  if (!result.active) return;
  assert.equal(result.endsAt, at(30));
});

test("دو دورهٔ چسبیده، یک زنجیره‌اند", () => {
  // ⚠️ خودِ باگ: بدونِ زنجیره، پاسخ روزِ ۳۰ بود نه ۶۰.
  const result = resolveCoverage([row(0, 30), row(30, 60)], now);
  assert.equal(result.active, true);
  if (!result.active) return;
  assert.equal(result.endsAt, at(60), "پایان باید انتهای زنجیره باشد");
  assert.equal(result.startsAt, at(0));
});

test("ترتیبِ ورودی مهم نیست", () => {
  const shuffled = resolveCoverage([row(30, 60), row(0, 30)], now);
  assert.equal(shuffled.active && shuffled.endsAt, at(60));
});

test("سه دورهٔ پشت‌سرهم", () => {
  const result = resolveCoverage([row(0, 30), row(30, 60), row(60, 90)], now);
  assert.equal(result.active && result.endsAt, at(90));
});

test("دورهٔ همپوشان، زنجیره را کوتاه نمی‌کند", () => {
  // هدیهٔ دستی تا روز ۱۰ + خریدی که از روز ۵ تا ۴۰ است.
  const result = resolveCoverage([row(0, 10, "manual_grant"), row(5, 40)], now);
  assert.equal(result.active && result.endsAt, at(40));
});

test("شکافِ زمانی زنجیره را قطع می‌کند", () => {
  // دورهٔ دوم یک روز بعد از پایانِ اولی شروع می‌شود: پیوسته نیست.
  const result = resolveCoverage([row(0, 30), row(31, 60)], now);
  assert.equal(result.active && result.endsAt, at(30), "دورهٔ جدا نباید به زنجیره بچسبد");
});

test("دورهٔ آینده به‌تنهایی دسترسی نمی‌دهد", () => {
  assert.deepEqual(resolveCoverage([row(10, 40)], now), { active: false });
});

test("لحظهٔ پایان دیگر دسترسی نیست (مرزِ نیم‌باز)", () => {
  const justEnded: CoverageRow = { startsAt: at(-10), endsAt: at(0), source: "purchase" };
  assert.deepEqual(resolveCoverage([justEnded], now), { active: false });
});

test("دسترسی دائمی، پایان ندارد", () => {
  const result = resolveCoverage([row(0, null)], now);
  assert.equal(result.active, true);
  if (!result.active) return;
  assert.equal(result.endsAt, null);
});

test("دسترسی دائمیِ چسبیده، کلِ زنجیره را دائمی می‌کند", () => {
  const result = resolveCoverage([row(0, 30), row(30, null)], now);
  assert.equal(result.active && result.endsAt, null);
});

test("منبع از دوره‌ای می‌آید که همین حالا را پوشش می‌دهد", () => {
  // امروز روی دسترسیِ آزمایشی است، هرچند دورهٔ خریداری‌شده از فردا شروع
  // می‌شود. برچسبِ صادقانه «آزمایشی» است.
  const result = resolveCoverage([row(0, 1, "manual_grant"), row(1, 31, "purchase")], now);
  assert.equal(result.active, true);
  if (!result.active) return;
  assert.equal(result.source, "manual_grant");
  assert.equal(result.endsAt, at(31));
});

test("تاریخ خراب، کلِ محاسبه را نمی‌شکند", () => {
  const broken: CoverageRow = { startsAt: "نه-تاریخ", endsAt: "هم-نه", source: "purchase" };
  const result = resolveCoverage([broken, row(0, 30)], now);
  assert.equal(result.active && result.endsAt, at(30));
});
