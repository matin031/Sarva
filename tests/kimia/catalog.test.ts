import { test } from "node:test";
import assert from "node:assert/strict";

import {
  KIMIA_FOOT_CATALOG,
  KIMIA_METERS,
  MAX_SLOTS,
  MIN_SLOTS,
  footPattern,
  isCatalogFoot,
  isKnownFoot,
  joinArk,
  kimiaMeterFor,
  normalizeFoot,
  parseSelection,
  resolveMeter,
  splitArk,
} from "@/lib/kimia/catalog";
import { AVAILABLE_AUDIO_ARKAN } from "@/lib/audioManifest";
import { ARKAN } from "@/lib/aruz/meters";

/* کاتالوگ *مشتق* است، پس این تست‌ها هم قاعده‌ها را می‌سنجند و هم مراقب‌اند
   که منابعِ بالادست (جدولِ اوزان، فهرستِ فایل‌های صوتی) بی‌صدا از زیرِ پای
   بازی کشیده نشوند. */

test("نرمال‌سازی، ی و ک و اعراب و نیم‌فاصله را یکسان می‌کند", () => {
  assert.equal(normalizeFoot("مفاعيلن"), normalizeFoot("مفاعیلن"));
  assert.equal(normalizeFoot("مفاعِيلُن"), normalizeFoot("مفاعیلن"));
  assert.equal(normalizeFoot("  مفاعیلن  "), "مفاعیلن");
  assert.equal(normalizeFoot("مفاعیلن‌مفاعیلن"), "مفاعیلنمفاعیلن");
  assert.equal(normalizeFoot("فاعلاتن   فاعلن"), "فاعلاتن فاعلن");
});

test("رکنِ عربی‌نویسی‌شده هم شناخته می‌شود", () => {
  assert.ok(isKnownFoot("مفاعيلن"));
  assert.ok(isCatalogFoot("مفاعيلن"));
  assert.equal(footPattern("مفاعيلن"), "U---");
});

test("splitArk و joinArk رفت‌وبرگشتِ بی‌اتلاف دارند", () => {
  const feet = splitArk("فاعلاتن  فاعلاتن فاعلن");
  assert.deepEqual(feet, ["فاعلاتن", "فاعلاتن", "فاعلن"]);
  assert.equal(joinArk(feet), "فاعلاتن فاعلاتن فاعلن");
  assert.deepEqual(splitArk(""), []);
});

test("هر وزنِ دامنه فایلِ صوتی دارد، در جدولِ اوزان هست و تعدادِ رکنش منطقی است", () => {
  assert.ok(KIMIA_METERS.length > 0, "دامنهٔ بازی نباید خالی باشد");
  for (const meter of KIMIA_METERS) {
    assert.ok(AVAILABLE_AUDIO_ARKAN.has(meter.ark), `${meter.ark} فایلِ صوتی ندارد`);
    assert.ok(meter.name.length > 0, `${meter.ark} نامِ وزن ندارد`);
    assert.ok(meter.canonical.length >= MIN_SLOTS && meter.canonical.length <= MAX_SLOTS);
    assert.equal(joinArk(meter.canonical), meter.ark);
  }
});

test("همهٔ پاسخ‌های پذیرفتنیِ یک وزن هم‌طول‌اند و ارکانشان شناخته‌شده", () => {
  for (const meter of KIMIA_METERS) {
    assert.equal(meter.accepted[0], meter.canonical, "متعارف باید اولِ فهرست باشد");
    for (const sequence of meter.accepted) {
      assert.equal(
        sequence.length,
        meter.canonical.length,
        `${meter.ark}: بدیلِ ناهم‌طول نباید پذیرفته شود`,
      );
      for (const foot of sequence) assert.ok(isKnownFoot(foot), `رکنِ ناشناخته: ${foot}`);
    }
    // بدیل‌ها نباید تکراری باشند
    const seen = new Set(meter.accepted.map(joinArk));
    assert.equal(seen.size, meter.accepted.length);
  }
});

test("بدیل‌ها الگوی هجاییِ کاملاً یکسانی با متعارف دارند", () => {
  const patternOf = (feet: readonly string[]) => feet.map((f) => footPattern(f)).join("");
  for (const meter of KIMIA_METERS) {
    const canonical = patternOf(meter.canonical);
    for (const sequence of meter.accepted) {
      assert.equal(
        patternOf(sequence),
        canonical,
        `${meter.ark}: بدیل باید دقیقاً همان ریتم را بدهد`,
      );
    }
  }
});

test("اوزانِ چند-تقطیعیِ واقعیِ مخزن شناسایی می‌شوند", () => {
  /* ⚠️ این تست عمداً روی دادهٔ واقعی است و نه یک نمونهٔ ساختگی: اگر روزی
     جدولِ اوزان عوض شود و این سه از هم جدا بیفتند، فرضِ «هر سؤال یک جواب»
     بی‌صدا برمی‌گردد — همان فرضی که کلِ این مکانیک رویش حساس است. */
  const multi = KIMIA_METERS.filter((m) => m.accepted.length > 1).map((m) => m.ark).sort();
  assert.deepEqual(multi, [
    "فعلات فاعلاتن فعلات فاعلاتن",
    "مستفعلن فعلن مستفعلن فعلن",
    "مفاعلن فعلاتن مفاعلن فعلن",
  ]);

  const basit = kimiaMeterFor("مستفعلن فعلن مستفعلن فعلن");
  assert.ok(basit);
  assert.deepEqual(
    basit.accepted.map(joinArk),
    ["مستفعلن فعلن مستفعلن فعلن", "مفعول مفتعلن مفعول مفتعلن"],
  );
});

test("رَک همهٔ ارکانِ همهٔ پاسخ‌های پذیرفتنی را دارد", () => {
  const needed = new Set<string>();
  for (const meter of KIMIA_METERS) {
    for (const sequence of meter.accepted) for (const foot of sequence) needed.add(foot);
  }
  assert.deepEqual([...KIMIA_FOOT_CATALOG].sort(), [...needed].sort());
  // یعنی هر پاسخِ درستی که سرور می‌پذیرد، با رَک قابلِ ساختن هم هست.
  for (const meter of KIMIA_METERS) {
    for (const sequence of meter.accepted) {
      for (const foot of sequence) assert.ok(isCatalogFoot(foot), `${foot} روی رَک نیست`);
    }
  }
});

test("هیچ دو رکنِ کاتالوگ الگوی هجاییِ یکسان ندارند", () => {
  /* نشانهٔ هر ماده همان الگوی هجایی‌اش است؛ اگر دو رکن یک الگو داشته
     باشند، دو ویال با نشانهٔ یکسان روی رَک می‌نشینند. */
  const byPattern = new Map<string, string>();
  for (const foot of KIMIA_FOOT_CATALOG) {
    const pattern = footPattern(foot);
    assert.ok(pattern, `${foot} الگوی هجایی ندارد`);
    const clash = byPattern.get(pattern!);
    assert.equal(clash, undefined, `${foot} و ${clash} هر دو ${pattern} دارند`);
    byPattern.set(pattern!, foot);
  }
});

test("وزنِ تک‌رکنی و وزنِ بیرونِ جدول وارد بازی نمی‌شوند", () => {
  // `‎/audio/مفتعلن.mp3` واقعاً هست ولی یک رکن بیشتر ندارد.
  assert.equal(kimiaMeterFor("مفتعلن"), null);
  // در فهرستِ صوتی هست ولی در جدولِ `METERS` نیست.
  assert.ok(AVAILABLE_AUDIO_ARKAN.has("مستفعل مستفعل مستفعل فع"));
  assert.equal(kimiaMeterFor("مستفعل مستفعل مستفعل فع"), null);
  // اصلاً وجود ندارد
  assert.equal(kimiaMeterFor("قلقلک قلقلک"), null);

  /* `resolveMeter` دامنهٔ بازی را نمی‌شناسد و فقط جدولِ اوزان را می‌بیند —
     پس وزنی که فایلِ صوتی ندارد را هم برمی‌گرداند. تفکیکشان عمدی است:
     یکی «آیا این وزن وجود دارد» را جواب می‌دهد و آن یکی «آیا این بازی
     می‌تواند بپرسدش». */
  assert.ok(resolveMeter("فاعلاتن فاعلاتن"));
  assert.equal(kimiaMeterFor("فاعلاتن فاعلاتن"), null);
  assert.equal(resolveMeter("مفتعلن"), null, "تک‌رکنی، حتی در جدول");
});

test("parseSelection ورودیِ مرورگر را کران‌دار و متعارف می‌کند", () => {
  assert.deepEqual(parseSelection(["فاعلاتن", "فاعلاتن", "فاعلن"], 3), [
    "فاعلاتن",
    "فاعلاتن",
    "فاعلن",
  ]);
  // یای عربی پذیرفته و متعارف می‌شود
  assert.deepEqual(parseSelection(["مفاعيلن", "مفاعیلن", "فعولن"], 3), [
    "مفاعیلن",
    "مفاعیلن",
    "فعولن",
  ]);
  // تکرار مجاز است — «فعولن فعولن فعولن فعولن» یک وزنِ واقعی است
  assert.deepEqual(parseSelection(["فعولن", "فعولن", "فعولن", "فعولن"], 4), [
    "فعولن",
    "فعولن",
    "فعولن",
    "فعولن",
  ]);

  assert.equal(parseSelection(["فاعلاتن", "فاعلن"], 3), null, "طولِ کمتر");
  assert.equal(parseSelection(["فاعلاتن", "فاعلاتن", "فاعلن", "فعل"], 3), null, "طولِ بیشتر");
  assert.equal(parseSelection(["فاعلاتن", "فاعلاتن", "چیزی"], 3), null, "رکنِ ناشناخته");
  assert.equal(parseSelection(["فاعلاتن", "فاعلاتن", 7], 3), null, "عضوِ غیررشته‌ای");
  assert.equal(parseSelection("فاعلاتن", 3), null, "غیرآرایه");
  assert.equal(parseSelection([], 0), null, "تعدادِ جایگاهِ بی‌معنا");
  assert.equal(
    parseSelection(Array.from({ length: 40 }, () => "فع"), 40),
    null,
    "بیش از سقفِ جایگاه‌ها",
  );
});

test("هر رکنی که در جدولِ اوزان هست، الگویش از همان جدول می‌آید", () => {
  // نگهبانِ رانشِ منبع: اگر `ARKAN` عوض شود، اینجا معلوم می‌شود.
  for (const [foot, pattern] of Object.entries(ARKAN)) {
    assert.equal(footPattern(foot), pattern);
  }
});
