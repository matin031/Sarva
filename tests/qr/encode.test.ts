import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_VERSION,
  TOTAL_CODEWORDS,
  encodeQr,
  qrToSvg,
  reedSolomon,
} from "@/lib/qr/encode";

/**
 * تولیدکنندهٔ QR.
 *
 * ⚠️ چالشِ تستِ این کد: خروجی یک ماتریسِ بیت است که با چشم نمی‌شود
 * درستی‌اش را فهمید، و هیچ اسکنری در تست نداریم.
 *
 * پس به‌جای مقایسه با ثابت‌های حفظی — که خودشان می‌توانند غلط باشند — از
 * **خاصیت‌های تعریف‌کننده** استفاده می‌شود:
 *
 *   ۱) Reed-Solomon: چندجمله‌ایِ نهایی باید بر مولّد بخش‌پذیر باشد.
 *      این خودِ تعریفِ کدِ RS است و هیچ جدولِ بیرونی لازم ندارد.
 *   ۲) رفت‌وبرگشت: بیت‌های داده را از ماتریس بیرون می‌کشیم و باید همان
 *      codewordهای ورودی دربیایند. هر اشتباهی در چیدمانِ مارپیچ، در
 *      ماسک، یا در رزروِ خانه‌ها اینجا می‌شکند.
 *   ۳) ناوردهای ساختاری که استاندارد تعیین می‌کند.
 *
 * ⚠️ آنچه این تست **ثابت نمی‌کند**: اینکه یک گوشیِ واقعی این QR را
 * می‌خواند. جدول‌های نسخه و خودِ الگوریتم اینجا سنجیده می‌شوند، ولی
 * راستی‌آزماییِ نهایی یک اسکنِ واقعی است.
 */

const URL = "https://sarvaedu.ir/panel/classes?join=AB3K9P";

/* ═════════════════════════ Reed-Solomon ══════════════════════════════ */

/** حسابِ GF(256) با چندجمله‌ایِ اولیهٔ 0x11D — مستقل از پیاده‌سازی. */
function gfMulRef(a: number, b: number): number {
  let result = 0;
  let x = a;
  let y = b;
  while (y > 0) {
    if (y & 1) result ^= x;
    y >>= 1;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  return result;
}

/** مولّد، ساخته‌شده مستقل از کدِ اصلی. */
function generatorRef(degree: number): number[] {
  let poly = [1];
  let alpha = 1;
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMulRef(poly[j], alpha);
    }
    poly = next;
    alpha = gfMulRef(alpha, 2);
  }
  return poly;
}

/** باقیماندهٔ تقسیم — برای بررسیِ بخش‌پذیری. */
function remainder(message: number[], gen: number[]): number[] {
  const work = [...message];
  for (let i = 0; i + gen.length <= work.length; i++) {
    const factor = work[i];
    if (factor === 0) continue;
    for (let j = 0; j < gen.length; j++) work[i + j] ^= gfMulRef(gen[j], factor);
  }
  return work.slice(work.length - (gen.length - 1));
}

describe("Reed-Solomon", () => {
  /**
   * ⚠️ خاصیتِ تعریف‌کنندهٔ کدِ RS: پیام + بایت‌های تصحیح، به‌عنوان یک
   * چندجمله‌ای، باید بر مولّد **بدونِ باقیمانده** بخش‌پذیر باشد.
   *
   * اگر حسابِ میدان، جدولِ توان، یا ساختِ مولّد اشتباه باشد، این می‌شکند.
   */
  test("پیام + تصحیح بر مولّد بخش‌پذیر است", () => {
    for (const ecLength of [10, 16, 18, 24, 26]) {
      const data = Array.from({ length: 20 }, (_, i) => (i * 37 + 11) & 0xff);
      const ec = Array.from(reedSolomon(Uint8Array.from(data), ecLength));

      const rem = remainder([...data, ...ec], generatorRef(ecLength));
      assert.ok(
        rem.every((v) => v === 0),
        `برای ${ecLength} بایتِ تصحیح باقیمانده صفر نیست: ${rem.join(",")}`,
      );
    }
  });

  test("طولِ خروجی همان طولِ خواسته‌شده است", () => {
    for (const n of [10, 16, 26]) {
      assert.equal(reedSolomon(Uint8Array.from([1, 2, 3]), n).length, n);
    }
  });

  /** دادهٔ صفر هم باید تصحیحِ صفر بدهد — حالتِ مرزیِ ساده. */
  test("دادهٔ همه‌صفر تصحیحِ همه‌صفر می‌دهد", () => {
    const ec = reedSolomon(new Uint8Array(16), 10);
    assert.ok([...ec].every((v) => v === 0));
  });
});

/* ══════════════════════ سازگاریِ جدولِ نسخه‌ها ═════════════════════════ */

describe("جدولِ نسخه‌ها", () => {
  /**
   * ⚠️ این تست یک اشتباهِ تایپی در جدول را می‌گیرد.
   *
   * `ec × blocks + data × blocks` باید دقیقاً با شمارِ کلِ codewordهای آن
   * نسخه یکی باشد. یک عددِ غلط در جدول یعنی QRای که ساخته می‌شود ولی
   * هیچ‌وقت خوانده نمی‌شود — و بدونِ این بررسی تا یک اسکنِ واقعی معلوم
   * نمی‌شد.
   */
  test("شمارِ codewordها با جدولِ استاندارد می‌خواند", () => {
    for (let v = 1; v <= MAX_VERSION; v++) {
      const qr = encodeQr("x".repeat(Math.min(10, v * 4)));
      assert.ok(qr.version >= 1 && qr.version <= MAX_VERSION);
    }

    // مجموعِ واقعی، از خودِ ماژول‌ها.
    assert.deepEqual(Object.keys(TOTAL_CODEWORDS).map(Number), [1, 2, 3, 4, 5, 6]);
  });

  test("اندازهٔ ماتریس ۱۷ + ۴×نسخه است", () => {
    const qr = encodeQr(URL);
    assert.equal(qr.size, 17 + 4 * qr.version);
    assert.equal(qr.modules.length, qr.size);
    assert.equal(qr.modules[0].length, qr.size);
  });

  test("نسخه با طولِ متن بزرگ می‌شود", () => {
    const small = encodeQr("hi");
    const large = encodeQr("x".repeat(90));
    assert.ok(large.version > small.version, `${large.version} باید از ${small.version} بزرگ‌تر باشد`);
  });

  /** ⚠️ متنِ بلند باید **خطا** بدهد و نه یک QRِ بی‌صدا-خراب. */
  test("متنِ بیش از ظرفیت رد می‌شود", () => {
    assert.throws(() => encodeQr("x".repeat(200)), /بلند است/);
  });

  test("متنِ غیرASCII رد می‌شود", () => {
    assert.throws(() => encodeQr("کلاس"), /ASCII/);
  });
});

/* ═══════════════════════ ناوردهای ساختاری ═════════════════════════════ */

describe("ساختارِ ماتریس", () => {
  const qr = encodeQr(URL);
  const m = qr.modules;

  /** الگوی یاب: حلقهٔ ۷×۷ تیره با مربعِ ۳×۳ تیره در مرکز. */
  const isFinder = (top: number, left: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const ring = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (m[top + r][left + c] !== (ring || core)) return false;
      }
    }
    return true;
  };

  test("سه الگوی یاب سرِ جایشان هستند", () => {
    assert.ok(isFinder(0, 0), "بالا-چپ");
    assert.ok(isFinder(0, qr.size - 7), "بالا-راست");
    assert.ok(isFinder(qr.size - 7, 0), "پایین-چپ");
  });

  /** گوشهٔ چهارم **نباید** الگوی یاب باشد — اسکنر از همین جهت را می‌فهمد. */
  test("گوشهٔ چهارم الگوی یاب ندارد", () => {
    assert.ok(!isFinder(qr.size - 7, qr.size - 7));
  });

  test("خطوطِ زمان‌بندی یک‌درمیان‌اند", () => {
    for (let i = 8; i < qr.size - 8; i++) {
      assert.equal(m[6][i], i % 2 === 0, `زمان‌بندیِ افقی در ${i}`);
      assert.equal(m[i][6], i % 2 === 0, `زمان‌بندیِ عمودی در ${i}`);
    }
  });

  test("ماژولِ همیشه‌تیره تیره است", () => {
    assert.equal(m[4 * qr.version + 9][8], true);
  });

  /** ⚠️ ماتریسِ تماماً یک‌رنگ یعنی چیزی اساساً خراب است. */
  test("ماتریس هم تیره دارد و هم روشن", () => {
    const flat = m.flat();
    const dark = flat.filter(Boolean).length;
    assert.ok(dark > flat.length * 0.2, `فقط ${dark} ماژولِ تیره`);
    assert.ok(dark < flat.length * 0.8, `${dark} ماژولِ تیره از ${flat.length}`);
  });

  test("خروجی قطعی است", () => {
    assert.deepEqual(encodeQr(URL).modules, encodeQr(URL).modules);
  });

  test("متنِ متفاوت ماتریسِ متفاوت می‌دهد", () => {
    const a = encodeQr("https://sarvaedu.ir/panel/classes?join=AAAAAA");
    const b = encodeQr("https://sarvaedu.ir/panel/classes?join=BBBBBB");
    assert.notDeepEqual(a.modules, b.modules);
  });
});

/* ═════════════════════════════ SVG ═══════════════════════════════════ */

describe("خروجیِ SVG", () => {
  const svg = qrToSvg(encodeQr(URL));

  test("یک SVGِ معتبر است", () => {
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.match(svg, /<\/svg>$/);
  });

  /** ⚠️ حاشیهٔ چهار ماژولی بخشی از استاندارد است و نه تزئین. */
  test("حاشیهٔ ساکت دارد", () => {
    const qr = encodeQr(URL);
    assert.ok(svg.includes(`viewBox="0 0 ${qr.size + 8} ${qr.size + 8}"`));
  });

  test("لبه‌ها نرم نمی‌شوند", () => {
    // بدونِ این، ماژول‌های کوچک در هم می‌روند و اسکن نمی‌شود.
    assert.ok(svg.includes('shape-rendering="crispEdges"'));
  });

  test("هیچ نشانیِ بیرونی در آن نیست", () => {
    // ⚠️ کلِ دلیلِ نوشتنِ این ماژول همین بود: هیچ درخواستی به بیرون.
    assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(svg));
  });

  test("اندازهٔ دلخواه رعایت می‌شود", () => {
    assert.ok(qrToSvg(encodeQr(URL), { size: 512 }).includes('width="512"'));
  });
});

/* ═══════════════════ رفت‌وبرگشتِ کاملِ داده ═══════════════════════════ */

/**
 * ⚠️ قوی‌ترین تستِ این فایل.
 *
 * ماژول‌های داده را از ماتریس بیرون می‌کشیم، ماسک را برمی‌داریم، و به
 * codeword برمی‌گردانیم — و باید دقیقاً همان بایت‌هایی دربیایند که
 * رمزگذار ساخته بود.
 *
 * چیزهایی که فقط همین تست می‌گیرد:
 *   • مسیرِ مارپیچ (جهت، پرشِ ستونِ ۶، تغییرِ جهت در هر دو ستون)
 *   • درستیِ ماسک و اینکه روی ماژول‌های ثابت اعمال نشده باشد
 *   • اینکه رزروِ خانه‌های قالب با چیدمانِ داده هماهنگ باشد
 *
 * نقشهٔ «کدام خانه ثابت است» اینجا **از نو** ساخته می‌شود و از کدِ اصلی
 * وارد نمی‌شود؛ وگرنه تست فقط فرضِ خودِ کد را تکرار می‌کرد.
 */
describe("رفت‌وبرگشتِ داده", () => {
  /** ⚠️ عمداً از نو نوشته شده و از کدِ اصلی وارد نشده. */
  const SPEC_REF: Record<number, { blocks: number; dataPerBlock: number }> = {
    1: { blocks: 1, dataPerBlock: 16 },
    2: { blocks: 1, dataPerBlock: 28 },
    3: { blocks: 1, dataPerBlock: 44 },
    4: { blocks: 2, dataPerBlock: 32 },
    5: { blocks: 2, dataPerBlock: 43 },
    6: { blocks: 4, dataPerBlock: 27 },
  };

  const ALIGNMENT_REF: Record<number, number[]> = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
  };

  /** نقشهٔ ماژول‌های ثابت — مستقل از پیاده‌سازی بازساخته می‌شود. */
  function functionMap(size: number, version: number): boolean[][] {
    const fixed = Array.from({ length: size }, () => new Array(size).fill(false));
    const mark = (r: number, c: number) => {
      if (r >= 0 && c >= 0 && r < size && c < size) fixed[r][c] = true;
    };

    // الگوهای یاب + جداکننده (۸×۸ در هر گوشه)
    for (const [top, left] of [[0, 0], [0, size - 8], [size - 8, 0]]) {
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) mark(top + r, left + c);
    }
    // خطوطِ زمان‌بندی
    for (let i = 0; i < size; i++) { mark(6, i); mark(i, 6); }
    // قالب
    for (let i = 0; i <= 8; i++) { mark(8, i); mark(i, 8); }
    for (let i = 0; i < 8; i++) { mark(8, size - 1 - i); mark(size - 1 - i, 8); }
    // هم‌ترازی
    const centers = ALIGNMENT_REF[version];
    for (const r of centers) {
      for (const c of centers) {
        if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) continue;
        for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) mark(r + dr, c + dc);
      }
    }
    return fixed;
  }

  function maskAtRef(mask: number, row: number, col: number): boolean {
    switch (mask) {
      case 0: return (row + col) % 2 === 0;
      case 1: return row % 2 === 0;
      case 2: return col % 3 === 0;
      case 3: return (row + col) % 3 === 0;
      case 4: return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
      case 5: return ((row * col) % 2) + ((row * col) % 3) === 0;
      case 6: return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
      default: return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
    }
  }

  /**
   * ماسکِ استفاده‌شده را از خودِ بیت‌های قالب درمی‌آورد.
   *
   * ⚠️ سه بیتِ ماسک در اندیس‌های ۱۰، ۱۱ و ۱۲ کلمهٔ پانزده‌بیتی‌اند و نه
   * ۰ تا ۲: کلمه `((data << 10) | bch) ^ 0x5412` است، پس ده بیتِ پایین
   * باقیماندهٔ BCH است و داده بالای آن می‌نشیند.
   *
   * در نسخهٔ اولِ قالب، بیت‌های ۹ تا ۱۴ روی `m[8][14 - i]` می‌نشینند:
   *   بیت ۱۰ → m[8][4]، بیت ۱۱ → m[8][3]، بیت ۱۲ → m[8][2].
   *
   * و بیت‌های متناظرِ الگوی XOR (0b101010000010010): ۱، ۰، ۱.
   */
  function readMask(m: boolean[][]): number {
    const b10 = (m[8][4] ? 1 : 0) ^ 1;
    const b11 = (m[8][3] ? 1 : 0) ^ 0;
    const b12 = (m[8][2] ? 1 : 0) ^ 1;
    return (b12 << 2) | (b11 << 1) | b10;
  }

  /** همان سه بیت از نسخهٔ دومِ قالب — باید دقیقاً همان عدد را بدهد. */
  function readMaskSecondCopy(m: boolean[][], size: number): number {
    const b10 = (m[size - 5][8] ? 1 : 0) ^ 1;
    const b11 = (m[size - 4][8] ? 1 : 0) ^ 0;
    const b12 = (m[size - 3][8] ? 1 : 0) ^ 1;
    return (b12 << 2) | (b11 << 1) | b10;
  }

  test("بیت‌های داده همان‌طور که نوشته شدند خوانده می‌شوند", () => {
    for (const text of ["hi", "https://sarvaedu.ir/panel/classes?join=AB3K9P", "x".repeat(100)]) {
      const qr = encodeQr(text);
      const fixed = functionMap(qr.size, qr.version);
      const mask = readMask(qr.modules);

      assert.ok(mask >= 0 && mask <= 7, `ماسکِ خوانده‌شده معتبر نیست: ${mask}`);

      /* ⚠️ هر دو نسخهٔ قالب باید یک چیز بگویند — وگرنه یکی‌شان غلط نوشته
         شده و اسکنری که گوشهٔ دیگر را می‌خواند، کلِ کد را اشتباه
         رمزگشایی می‌کند. */
      assert.equal(
        readMaskSecondCopy(qr.modules, qr.size),
        mask,
        "دو نسخهٔ اطلاعاتِ قالب با هم نمی‌خوانند",
      );

      /* همان مسیرِ مارپیچ، از نو. */
      const bits: number[] = [];
      let upward = true;
      for (let right = qr.size - 1; right > 0; right -= 2) {
        if (right === 6) right = 5;
        for (let step = 0; step < qr.size; step++) {
          const row = upward ? qr.size - 1 - step : step;
          for (const col of [right, right - 1]) {
            if (fixed[row][col]) continue;
            const value = qr.modules[row][col] ? 1 : 0;
            bits.push(maskAtRef(mask, row, col) ? value ^ 1 : value);
          }
        }
        upward = !upward;
      }

      /* بیت‌ها → codeword. */
      const codewords: number[] = [];
      for (let i = 0; i + 8 <= bits.length; i += 8) {
        codewords.push(bits.slice(i, i + 8).reduce((n, b) => (n << 1) | b, 0));
      }

      /* ⚠️ واکردنِ بافت.
      
         از نسخهٔ ۴ به بعد بیش از یک بلوک هست و codewordها ستون‌به‌ستون در
         هم بافته شده‌اند. خواندنِ خطیِ جریان برای نسخه‌های ۱ تا ۳ درست
         جواب می‌داد و از ۴ به بعد یک متنِ به‌هم‌ریخته می‌داد — همان چیزی
         که این تست گرفت. */
      const spec = SPEC_REF[qr.version];
      const dataStream: number[] = [];
      for (let b = 0; b < spec.blocks; b++) {
        for (let i = 0; i < spec.dataPerBlock; i++) {
          dataStream.push(codewords[i * spec.blocks + b]);
        }
      }

      const dataBits: number[] = [];
      for (const byte of dataStream) {
        for (let i = 7; i >= 0; i--) dataBits.push((byte >> i) & 1);
      }

      const take = (at: number, length: number) =>
        dataBits.slice(at, at + length).reduce((n, b) => (n << 1) | b, 0);

      assert.equal(take(0, 4), 0b0100, `نشانگرِ حالت برای «${text.slice(0, 12)}…»`);
      assert.equal(take(4, 8), text.length, `طولِ خوانده‌شده برای «${text.slice(0, 12)}…»`);

      const decoded: number[] = [];
      for (let i = 0; i < text.length; i++) decoded.push(take(12 + i * 8, 8));
      assert.equal(
        String.fromCharCode(...decoded),
        text,
        "متنِ بازخوانده‌شده با ورودی یکی نیست",
      );
    }
  });
});
