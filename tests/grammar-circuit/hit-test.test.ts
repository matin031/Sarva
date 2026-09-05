import test from "node:test";
import assert from "node:assert/strict";
import {
  distanceToRect,
  resolveHitTarget,
  type HitCandidate,
} from "../../lib/grammar-circuit/hit-test";

/* چیدمانِ واقعیِ بازی: سوکت‌ها کنارِ هم، و ناحیهٔ لمسیِ هرکدام
   `calc(100% + 12px)` — یعنی ۶ پیکسل از هر طرف بیرون‌تر.

   سوکت‌ها ۶۶ پیکسل پهنا دارند و با فاصلهٔ ۸ پیکسل چیده شده‌اند. پس ناحیه‌ها
   ۷۸ پیکسل می‌شوند و ۴ پیکسل روی هم می‌افتند — همان هم‌پوشانی‌ای که در
   گزارشِ کاربر «t3, t4» بود. */
function socket(tokenId: string, socketLeft: number): HitCandidate {
  return {
    tokenId,
    rect: { left: socketLeft - 6, top: 100 - 13, width: 66 + 12, height: 42 + 26 },
  };
}

const t3 = socket("t3", 0);
const t4 = socket("t4", 74); // ۶۶ پهنا + ۸ فاصله
const row: HitCandidate[] = [t3, t4];

/** مرکزِ ناحیهٔ لمسیِ یک نامزد. */
const centerOf = (c: HitCandidate) => ({
  x: c.rect.left + c.rect.width / 2,
  y: c.rect.top + c.rect.height / 2,
});

test("distanceToRect: داخلِ مستطیل صفر است، بیرونش فاصلهٔ واقعی", () => {
  const r = { left: 0, top: 0, width: 10, height: 10 };
  assert.equal(distanceToRect(5, 5, r), 0);
  assert.equal(distanceToRect(0, 0, r), 0);
  assert.equal(distanceToRect(13, 5, r), 3);
  assert.equal(distanceToRect(-4, 5, r), 4);
  assert.equal(distanceToRect(14, 14, r), Math.hypot(4, 4));
});

test("رها کردن دقیقاً روی یک خانه، همان خانه را می‌دهد", () => {
  const c3 = centerOf(t3);
  assert.deepEqual(resolveHitTarget(c3.x, c3.y, row), { kind: "hit", tokenId: "t3" });
  const c4 = centerOf(t4);
  assert.deepEqual(resolveHitTarget(c4.x, c4.y, row), { kind: "hit", tokenId: "t4" });
});

/* ⚠️ همین تست باگِ گزارش‌شده را می‌گیرد.
   نسخهٔ پیشین در این نقطه `ambiguous` می‌داد، هیچ اتصالی ثبت نمی‌کرد و فقط
   یک `console.error` می‌نوشت: «ناحیه‌های لمسیِ هم‌پوشان: t3, t4». */
test("در نوارِ هم‌پوشانی، خانه‌ای برنده است که مرکزش نزدیک‌تر باشد", () => {
  // نوارِ هم‌پوشانی: از ابتدای ناحیهٔ t4 تا انتهای ناحیهٔ t3
  const overlapStart = t4.rect.left; // ۶۸
  const overlapEnd = t3.rect.left + t3.rect.width; // ۷۲
  assert.ok(overlapEnd > overlapStart, "چیدمانِ آزمون باید واقعاً هم‌پوشانی داشته باشد");

  const y = centerOf(t3).y;

  // یک پیکسل داخلِ هم‌پوشانی از سمتِ t3 → هنوز t3
  assert.deepEqual(
    resolveHitTarget(overlapStart + 0.5, y, row),
    { kind: "hit", tokenId: "t3" },
    "نزدیک‌تر به مرکزِ t3",
  );

  // یک پیکسل داخلِ هم‌پوشانی از سمتِ t4 → t4
  assert.deepEqual(
    resolveHitTarget(overlapEnd - 0.5, y, row),
    { kind: "hit", tokenId: "t4" },
    "نزدیک‌تر به مرکزِ t4",
  );

  // هیچ نقطه‌ای در نوارِ هم‌پوشانی نباید بی‌جواب بماند
  for (let x = overlapStart; x <= overlapEnd; x += 0.25) {
    const r = resolveHitTarget(x, y, row);
    assert.equal(r.kind, "hit", `در x=${x} هیچ خانه‌ای انتخاب نشد`);
  }
});

test("در تساویِ کامل، اولین نامزد (ترتیبِ سند) برنده می‌ماند — و قطعی است", () => {
  // دو ناحیهٔ کاملاً منطبق
  const a: HitCandidate = { tokenId: "a", rect: { left: 0, top: 0, width: 40, height: 40 } };
  const b: HitCandidate = { tokenId: "b", rect: { left: 0, top: 0, width: 40, height: 40 } };
  const first = resolveHitTarget(20, 20, [a, b]);
  assert.deepEqual(first, { kind: "hit", tokenId: "a" });
  // ده بار پشتِ سرِ هم، همان جواب
  for (let i = 0; i < 10; i++) {
    assert.deepEqual(resolveHitTarget(20, 20, [a, b]), first);
  }
  // و با ترتیبِ برعکس، نامزدِ اولِ همان فهرست
  assert.deepEqual(resolveHitTarget(20, 20, [b, a]), { kind: "hit", tokenId: "b" });
});

test("بیرونِ همه، ولی داخلِ شعاعِ چسبیدن → نزدیک‌ترین خانه", () => {
  const y = centerOf(t3).y;
  const justRight = t4.rect.left + t4.rect.width + 10; // ۱۰ پیکسل بیرونِ t4
  assert.deepEqual(resolveHitTarget(justRight, y, row, 24), { kind: "hit", tokenId: "t4" });
});

test("بیرونِ همه و بیرونِ شعاع → هیچ، نه حدس", () => {
  const y = centerOf(t3).y;
  const farAway = t4.rect.left + t4.rect.width + 300;
  assert.deepEqual(resolveHitTarget(farAway, y, row, 24), { kind: "none" });
  // بدونِ شعاع هم همین‌طور
  assert.deepEqual(resolveHitTarget(t4.rect.left + t4.rect.width + 5, y, row, 0), {
    kind: "none",
  });
});

test("خانه‌ای که هنوز چیده نشده (ابعادِ صفر) نامزد نیست", () => {
  const ghost: HitCandidate = {
    tokenId: "ghost",
    rect: { left: 0, top: 0, width: 0, height: 0 },
  };
  assert.deepEqual(resolveHitTarget(0, 0, [ghost], 50), { kind: "none" });
});

test("فهرستِ خالی → هیچ", () => {
  assert.deepEqual(resolveHitTarget(10, 10, [], 40), { kind: "none" });
});
