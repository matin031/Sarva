import test from "node:test";
import assert from "node:assert/strict";
import {
  SLAM_IMPACT_AT,
  SLAM_TOTAL,
  bookPose,
  makeBookPose,
  type BookCueKind,
} from "../../components/UI/poets-shelf/scene/bookChoreography";
import { defaultPoetsShelfConfig } from "../../lib/poets-shelf/config";
import { ARRIVAL_Z, BOOK_Z, CHARACTER_HEIGHT, SHELF_Y } from "../../lib/poets-shelf/layout";

/* ═══════════════════════════════════════════════════════════════════════════
   رقصِ کتاب — ریاضیِ پشتِ چیزی که دیده می‌شود.
   ═══════════════════════════════════════════════════════════════════════════

   تابع خالص است، پس همان چیزی که در مرورگر فقط با نگاه‌کردن فهمیده می‌شود
   اینجا قابلِ ادعا کردن است: کتاب واقعاً به سر می‌رسد، واقعاً برمی‌گردد، و
   هیچ ژستی مقدارِ ژستِ قبلی را با خودش حمل نمی‌کند.
   ═══════════════════════════════════════════════════════════════════════════ */

const ALL_CUES: BookCueKind[] = ["rest", "hover", "chosen", "cheer", "slam"];
const REST_X = 1.2;

function poseAt(kind: BookCueKind, elapsed: number, reduced = false) {
  return bookPose(makeBookPose(), kind, elapsed, 0, REST_X, reduced);
}

test("⚠️ هر ژست همهٔ کانال‌ها را می‌نویسد — هیچ مقداری از ژستِ قبلی نشت نمی‌کند", () => {
  /* همان اشکالی که در `Player.tsx`ِ پلِ وزن مستند شده بود: ژستی که فقط
     چیزهای لازمِ خودش را بنویسد، بقیه را از ژستِ قبلی به ارث می‌برد و آن
     نشت تنها وقتی دیده می‌شود که ترتیبِ حالت‌ها عوض شود.

     آزمون: یک شیءِ ژست را با زباله پر می‌کنیم و هر نشانه را رویش اجرا
     می‌کنیم. اگر چیزی از زباله باقی بماند، آن کانال نوشته نشده. */
  for (const kind of ALL_CUES) {
    for (const elapsed of [0, 120, 400, 900, 2000]) {
      const dirty = makeBookPose();
      dirty.x = 99;
      dirty.y = 99;
      dirty.z = 99;
      dirty.rotX = 9;
      dirty.rotY = 9;
      dirty.rotZ = 9;
      dirty.scaleX = 9;
      dirty.scaleY = 9;
      dirty.scaleZ = 9;
      dirty.glow = 9;

      const pose = bookPose(dirty, kind, elapsed, 0, REST_X, false);
      for (const [key, value] of Object.entries(pose)) {
        assert.notEqual(value, key.startsWith("scale") ? 9 : 99, `${kind}@${elapsed}: کانالِ ${key} نوشته نشد`);
        assert.ok(Number.isFinite(value), `${kind}@${elapsed}: ${key} عددِ معتبر نیست`);
      }
    }
  }
});

test("در حالتِ آرام، کتاب روی طاقچه و در جای خودش است", () => {
  const pose = poseAt("rest", 0, true);
  assert.equal(pose.x, REST_X);
  assert.equal(pose.y, SHELF_Y);
  assert.equal(pose.z, BOOK_Z);
  assert.equal(pose.rotX, 0);
  assert.equal(pose.glow, 0);
});

test("⚠️ کتاب دقیقاً در لحظهٔ برخورد به سرِ شخصیت می‌رسد", () => {
  /* اگر این بشکند، شخصیت پیش از رسیدنِ کتاب زمین می‌خورد (یا بعد از آن) و
     کلِ رابطهٔ علت و معلولِ صحنه از بین می‌رود. */
  const atImpact = poseAt("slam", SLAM_IMPACT_AT);

  // ارتفاع: روی سرِ شخصیت، نه بالاتر و نه پایین‌تر.
  assert.ok(
    Math.abs(atImpact.y - CHARACTER_HEIGHT * 0.945) < 0.02,
    `ارتفاعِ برخورد ${atImpact.y.toFixed(3)} است ولی سرِ شخصیت حدودِ ${(CHARACTER_HEIGHT * 0.945).toFixed(3)}`,
  );
  // عمق: مرکزِ کتابِ خوابیده باید روی شخصیت بیفتد.
  assert.ok(Math.abs(atImpact.z - (ARRIVAL_Z - 0.28)) < 0.02, "عمقِ برخورد با جای ایستادنِ شخصیت نمی‌خواند");
  // و کتاب باید خوابیده باشد، نه سرِپا.
  assert.ok(atImpact.rotX > Math.PI / 2 - 0.05, "کتاب باید در لحظهٔ برخورد افقی شده باشد");
});

test("⚠️ زمان‌بندیِ کوبش با ماشینِ حالت یکی است", () => {
  /* `config.slamMs` همان لحظه‌ای است که ماشین رویدادِ `impact` را می‌فرستد.
     اگر از `SLAM_FALL` جدا بیفتد، شخصیت و کتاب از هم عقب می‌افتند — و چون
     هر دو درست *به‌نظر* می‌رسند، اشکالش سخت پیدا می‌شود. */
  assert.equal(defaultPoetsShelfConfig.slamMs, SLAM_IMPACT_AT);
});

test("کتاب شتاب می‌گیرد و نه با سرعتِ یکنواخت می‌افتد", () => {
  /* نیمهٔ دومِ سقوط باید مسافتِ بیشتری را طی کند. با حرکتِ یکنواخت، کتاب
     شبیهِ چیزی می‌شد که آرام پایین آورده می‌شود. */
  const start = poseAt("slam", 0).y;
  const mid = poseAt("slam", SLAM_IMPACT_AT / 2).y;
  const end = poseAt("slam", SLAM_IMPACT_AT).y;
  const firstHalf = start - mid;
  const secondHalf = mid - end;
  assert.ok(secondHalf > firstHalf, "نیمهٔ دومِ سقوط باید بلندتر از نیمهٔ اول باشد");
});

test("کتاب پس از کوبش، شخصیت را آزاد می‌کند و سرِ جایش برمی‌گردد", () => {
  const settled = poseAt("slam", SLAM_TOTAL);
  assert.ok(Math.abs(settled.y - SHELF_Y) < 0.01, "باید به ارتفاعِ طاقچه برگردد");
  assert.ok(Math.abs(settled.z - BOOK_Z) < 0.01, "باید به عمقِ طاقچه برگردد");
  assert.ok(Math.abs(settled.rotX) < 0.01, "باید دوباره سرِپا بایستد");
  assert.equal(settled.x, REST_X, "نباید جای افقی‌اش عوض شده باشد");
});

test("له‌شدنِ لحظهٔ برخورد حجم را تقریباً حفظ می‌کند", () => {
  const squashed = poseAt("slam", SLAM_IMPACT_AT + 47);
  assert.ok(squashed.scaleY < 0.95, "باید در راستای ارتفاع له شود");
  assert.ok(squashed.scaleX > 1.02, "باید در عوض پهن شود");
  const volume = squashed.scaleX * squashed.scaleY * squashed.scaleZ;
  assert.ok(Math.abs(volume - 1) < 0.12, `حجم باید تقریباً ثابت بماند، شد ${volume.toFixed(3)}`);
});

test("جشن بالا می‌رود و بعد سرِ جایش برمی‌گردد", () => {
  const rising = poseAt("cheer", 260);
  assert.ok(rising.y > SHELF_Y + 0.2, "باید از طاقچه بلند شود");
  assert.equal(rising.glow, 1, "باید در اوجِ درخشش باشد");

  const done = poseAt("cheer", 260 + 1050 + 420);
  assert.ok(Math.abs(done.y - SHELF_Y) < 0.01, "باید به طاقچه برگردد");
  assert.ok(done.glow < 0.01, "درخشش باید خاموش شده باشد");
});

test("⚠️ در حالتِ «حرکتِ کم»، حرکتِ ضروری می‌ماند و تزئینی می‌رود", () => {
  /* صورت‌مسئله صریح بود: کم‌کردنِ حرکت نباید بازی را از کار بیندازد. */

  // شناوریِ بیکارِ کتاب — تزئینی، پس حذف می‌شود.
  assert.equal(poseAt("rest", 0, true).y, SHELF_Y);
  assert.notEqual(bookPose(makeBookPose(), "rest", 0, 1.3, REST_X, false).y, SHELF_Y);

  // ولی کوبش — که خودِ پیامِ بازی است — دست‌نخورده می‌ماند.
  const reduced = poseAt("slam", SLAM_IMPACT_AT, true);
  const normal = poseAt("slam", SLAM_IMPACT_AT, false);
  assert.equal(reduced.y, normal.y);
  assert.equal(reduced.rotX, normal.rotX);
});

test("hover کتاب را به سمتِ بازیکن می‌آورد", () => {
  const hovered = poseAt("hover", 200);
  assert.ok(hovered.z > BOOK_Z, "باید از قفسه بیرون بیاید");
  assert.ok(hovered.glow > 0, "باید کمی بدرخشد");
  assert.ok(hovered.z - BOOK_Z < 0.12, "ولی نه آن‌قدر که چیدمان به‌هم بخورد");
});
