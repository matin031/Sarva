/**
 * تولیدِ QR — پیاده‌سازیِ کمینه و خالص، بدونِ هیچ وابستگی.
 *
 * =============================================================================
 * ⚠️ چرا نه یک package و نه یک سرویسِ بیرونی
 * =============================================================================
 *
 * سرویس‌های آنلاینِ QR (نوعِ `api.qrserver.com/…?data=`) یعنی **لینکِ دعوتِ
 * کلاس به سرورِ یک شرکتِ دیگر می‌رود**. آن لینک کدِ عضویت دارد؛ فرستادنش
 * بیرون دقیقاً همان چیزی است که کلِ این قابلیت باید از آن محافظت کند.
 *
 * و یک package برای کاری که اینجا در چند صد خط تمام می‌شود، یک وابستگیِ
 * دائمی است: به‌روزرسانی، بررسیِ امنیتی، و حجمِ باندل.
 *
 * =============================================================================
 * ⚠️ دامنهٔ پشتیبانی — عمداً محدود
 * =============================================================================
 *
 * فقط **حالتِ بایت**، سطحِ تصحیحِ خطای **M**، و نسخه‌های **۱ تا ۶**.
 *
 * این محدودیت‌ها انتخاب شده‌اند و نه کمبود:
 *
 *   • نسخهٔ ۶ تا ۱۰۸ بایت جا دارد و لینکِ دعوتِ ما حدودِ ۴۵ بایت است.
 *   • نسخه‌های ۷ به بالا یک ناحیهٔ «اطلاعاتِ نسخه» هم دارند — یک بلوکِ
 *     دیگر با BCH خودش. نداشتنش یعنی یک منبعِ کاملِ خطا حذف شده.
 *   • حالتِ بایت هر URLای را می‌پذیرد؛ حالتِ عددی و الفبایی فقط فشرده‌ترند.
 *
 * اگر روزی رشتهٔ بلندتری لازم شد، تابع صریحاً خطا می‌دهد و بی‌صدا یک QRِ
 * خراب نمی‌سازد.
 *
 * =============================================================================
 * ⚠️ چطور راستی‌آزمایی شده
 * =============================================================================
 *
 * در `tests/qr/encode.test.ts`:
 *   • حسابِ GF(256) با خاصیتِ تعریف‌کننده‌اش (نه با ثابت‌های حفظی).
 *   • درستیِ Reed-Solomon با همان خاصیت: چندجمله‌ایِ نهایی باید بر مولّد
 *     **بخش‌پذیر** باشد.
 *   • رفت‌وبرگشتِ کامل: ماژول‌های داده دوباره خوانده و به codeword تبدیل
 *     می‌شوند و باید با ورودی یکی باشند — این هر اشتباهی در چیدمان و
 *     ماسک را می‌گیرد.
 *   • ناوردهای ساختاری: اندازه، الگوهای یاب، خطوطِ زمان‌بندی.
 *
 * ⚠️ آنچه راستی‌آزمایی **نشده**: با یک اسکنرِ واقعی خوانده نشده.
 */

/* ════════════════════════ حسابِ میدانِ گالوا ═══════════════════════════ */

/**
 * جدول‌های توان و لگاریتمِ GF(256) با چندجمله‌ایِ اولیهٔ 0x11D.
 *
 * ⚠️ 0x11D همان چیزی است که استانداردِ QR تعیین می‌کند. هر مقدارِ دیگری یک
 * میدانِ کاملاً معتبرِ *دیگر* می‌سازد و نتیجه‌اش QRای است که هیچ اسکنری
 * نمی‌خواند.
 */
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  // تکرارِ جدول تا ۵۱۱، تا ضرب لازم نباشد هر بار `% 255` بگیرد.
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

/**
 * چندجمله‌ایِ مولّدِ Reed-Solomon از درجهٔ `degree`.
 *
 * حاصل‌ضربِ (x − α⁰)(x − α¹)…(x − α^(degree−1)). در GF(256) تفریق همان
 * XOR است.
 */
function generatorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

/** باقیماندهٔ تقسیمِ داده بر مولّد — همان بایت‌های تصحیحِ خطا. */
export function reedSolomon(data: Uint8Array, ecLength: number): Uint8Array {
  const gen = generatorPoly(ecLength);
  const remainder = new Uint8Array(data.length + ecLength);
  remainder.set(data);

  for (let i = 0; i < data.length; i++) {
    const factor = remainder[i];
    if (factor === 0) continue;
    for (let j = 0; j < gen.length; j++) {
      remainder[i + j] ^= gfMul(gen[j], factor);
    }
  }

  return remainder.slice(data.length);
}

/* ═════════════════════════ جدول‌های نسخه ══════════════════════════════ */

type VersionSpec = {
  /** بایت‌های تصحیحِ خطا در هر بلوک. */
  ecPerBlock: number;
  /** تعدادِ بلوک. */
  blocks: number;
  /** بایت‌های داده در هر بلوک. */
  dataPerBlock: number;
};

/**
 * نسخه‌های ۱ تا ۶، سطحِ M.
 *
 * ⚠️ این اعداد از خودِ استاندارد می‌آیند و قابلِ استنتاج نیستند. یک بررسیِ
 * ساده که در تست هم هست: `ecPerBlock * blocks + dataPerBlock * blocks`
 * باید با شمارِ کلِ codewordهای آن نسخه یکی باشد
 * (۲۶، ۴۴، ۷۰، ۱۰۰، ۱۳۴، ۱۷۲).
 */
const VERSIONS: Record<number, VersionSpec> = {
  1: { ecPerBlock: 10, blocks: 1, dataPerBlock: 16 },
  2: { ecPerBlock: 16, blocks: 1, dataPerBlock: 28 },
  3: { ecPerBlock: 26, blocks: 1, dataPerBlock: 44 },
  4: { ecPerBlock: 18, blocks: 2, dataPerBlock: 32 },
  5: { ecPerBlock: 24, blocks: 2, dataPerBlock: 43 },
  6: { ecPerBlock: 16, blocks: 4, dataPerBlock: 27 },
};

export const MAX_VERSION = 6;

/** شمارِ کلِ codewordهای هر نسخه — برای بررسیِ سازگاریِ جدول. */
export const TOTAL_CODEWORDS: Record<number, number> = {
  1: 26,
  2: 44,
  3: 70,
  4: 100,
  5: 134,
  6: 172,
};

/** مرکزِ الگوهای هم‌ترازی. برای نسخه‌های ۲ تا ۶ فقط یکی واقعاً کشیده می‌شود. */
const ALIGNMENT: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
};

function sizeOf(version: number): number {
  return 17 + 4 * version;
}

/* ═══════════════════════════ رمزگذاریِ داده ════════════════════════════ */

/** کوچک‌ترین نسخه‌ای که این تعداد بایت در آن جا می‌شود. */
function pickVersion(byteLength: number): number {
  for (let v = 1; v <= MAX_VERSION; v++) {
    const spec = VERSIONS[v];
    const capacity = spec.blocks * spec.dataPerBlock;
    /* ۴ بیت نشانگرِ حالت + ۸ بیت شمارِ نویسه (برای نسخه‌های ۱ تا ۹)
       = ۲ بایتِ سربار. */
    if (byteLength + 2 <= capacity) return v;
  }
  throw new Error(`متن برای QR نسخهٔ ${MAX_VERSION} بلند است (${byteLength} بایت).`);
}

/** بیت‌های حالتِ بایت → آرایهٔ codeword، با padding استاندارد. */
function encodeData(bytes: Uint8Array, version: number): Uint8Array {
  const spec = VERSIONS[version];
  const capacity = spec.blocks * spec.dataPerBlock;

  const bits: number[] = [];
  const push = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >> i) & 1);
  };

  push(0b0100, 4); // نشانگرِ حالتِ بایت
  push(bytes.length, 8); // شمارِ نویسه — ۸ بیت برای نسخه‌های ۱ تا ۹
  for (const b of bytes) push(b, 8);

  // پایان‌بخش: تا ۴ بیتِ صفر، ولی نه بیشتر از فضای باقی‌مانده.
  const maxBits = capacity * 8;
  for (let i = 0; i < 4 && bits.length < maxBits; i++) bits.push(0);

  // تا مرزِ بایت صفر.
  while (bits.length % 8 !== 0) bits.push(0);

  const out = new Uint8Array(capacity);
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i + j];
    out[i / 8] = byte;
  }

  /* ⚠️ بایت‌های پرکنندهٔ استاندارد: 0xEC و 0x11 به‌ترتیب و تکرارشونده.
     هر مقدارِ دیگری هم «کار می‌کند» ولی با استاندارد نمی‌خواند. */
  const used = Math.ceil(bits.length / 8);
  const PAD = [0xec, 0x11];
  for (let i = used; i < capacity; i++) out[i] = PAD[(i - used) % 2];

  return out;
}

/**
 * درهم‌بافیِ بلوک‌ها.
 *
 * ⚠️ codewordها بلوک‌به‌بلوک پشتِ سرِ هم نمی‌نشینند؛ ستون‌به‌ستون در هم
 * بافته می‌شوند. دلیلش خودِ هدفِ تصحیحِ خطاست: یک لکه روی کاغذ نباید همهٔ
 * بایت‌های یک بلوک را با هم از بین ببرد.
 */
function interleave(data: Uint8Array, version: number): Uint8Array {
  const spec = VERSIONS[version];

  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  for (let i = 0; i < spec.blocks; i++) {
    const block = data.slice(i * spec.dataPerBlock, (i + 1) * spec.dataPerBlock);
    dataBlocks.push(block);
    ecBlocks.push(reedSolomon(block, spec.ecPerBlock));
  }

  const out: number[] = [];
  for (let i = 0; i < spec.dataPerBlock; i++) {
    for (const block of dataBlocks) out.push(block[i]);
  }
  for (let i = 0; i < spec.ecPerBlock; i++) {
    for (const block of ecBlocks) out.push(block[i]);
  }

  return new Uint8Array(out);
}

/* ════════════════════════════ ماتریس ══════════════════════════════════ */

/** −1 یعنی «هنوز نوشته نشده»؛ ۰ و ۱ روشن و خاموش. */
type Matrix = Int8Array[];

function blankMatrix(size: number): Matrix {
  return Array.from({ length: size }, () => new Int8Array(size).fill(-1));
}

function placeFinder(m: Matrix, row: number, col: number): void {
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const rr = row + r;
      const cc = col + c;
      if (rr < 0 || cc < 0 || rr >= m.length || cc >= m.length) continue;
      const inRing = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
        (c >= 0 && c <= 6 && (r === 0 || r === 6));
      const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      m[rr][cc] = inRing || inCore ? 1 : 0;
    }
  }
}

function placeAlignment(m: Matrix, version: number): void {
  const centers = ALIGNMENT[version];
  const size = m.length;

  for (const r of centers) {
    for (const c of centers) {
      /* ⚠️ الگوهایی که روی الگوهای یاب می‌افتند رسم نمی‌شوند. برای
         نسخه‌های ۲ تا ۶ یعنی فقط گوشهٔ پایین-راست باقی می‌ماند. */
      if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) {
        continue;
      }
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const ring = Math.max(Math.abs(dr), Math.abs(dc));
          m[r + dr][c + dc] = ring === 1 ? 0 : 1;
        }
      }
    }
  }
}

function placeTiming(m: Matrix): void {
  for (let i = 8; i < m.length - 8; i++) {
    const value = i % 2 === 0 ? 1 : 0;
    if (m[6][i] === -1) m[6][i] = value;
    if (m[i][6] === -1) m[i][6] = value;
  }
}

/** خانه‌هایی که اطلاعاتِ قالب در آن‌ها می‌نشیند — داده نباید آنجا برود. */
function reserveFormat(m: Matrix): void {
  const size = m.length;
  for (let i = 0; i <= 8; i++) {
    if (m[8][i] === -1) m[8][i] = 0;
    if (m[i][8] === -1) m[i][8] = 0;
  }
  for (let i = 0; i < 8; i++) {
    if (m[8][size - 1 - i] === -1) m[8][size - 1 - i] = 0;
    if (m[size - 1 - i][8] === -1) m[size - 1 - i][8] = 0;
  }
}

/**
 * ۱۵ بیتِ اطلاعاتِ قالب: ۲ بیت سطحِ تصحیح + ۳ بیت ماسک + ۱۰ بیت BCH،
 * و در پایان XOR با 0x5412.
 *
 * ⚠️ آن XOR لازم است: بدونِ آن، ترکیبِ «سطح M و ماسک ۰» پانزده بیتِ صفر
 * می‌شد و اسکنر نمی‌توانست از نویز تشخیصش دهد.
 */
function formatBits(mask: number): number {
  const EC_M = 0b00;
  const data = (EC_M << 3) | mask;

  let rem = data << 10;
  for (let i = 14; i >= 10; i--) {
    if ((rem >> i) & 1) rem ^= 0b10100110111 << (i - 10);
  }

  return ((data << 10) | rem) ^ 0b101010000010010;
}

function placeFormat(m: Matrix, mask: number): void {
  const size = m.length;
  const bits = formatBits(mask);
  const bit = (i: number) => (bits >> i) & 1;

  /* نسخهٔ اول، دورِ الگوی یابِ بالا-چپ: ستونِ ۸ از بالا، بعد ردیفِ ۸ از
     راست. جهشِ روی ردیف/ستونِ ۶ عمدی است — خطوطِ زمان‌بندی آنجایند. */
  for (let i = 0; i <= 5; i++) m[i][8] = bit(i);
  m[7][8] = bit(6);
  m[8][8] = bit(7);
  m[8][7] = bit(8);
  for (let i = 9; i <= 14; i++) m[8][14 - i] = bit(i);

  /* نسخهٔ دوم، تقسیم‌شده بینِ دو گوشهٔ دیگر — تا اگر یک گوشه آسیب دید،
     اسکنر باز هم بتواند قالب را بخواند. */
  for (let i = 0; i <= 7; i++) m[8][size - 1 - i] = bit(i);
  for (let i = 8; i <= 14; i++) m[size - 15 + i][8] = bit(i);

  /* ⚠️ ماژولِ همیشه‌تیره **اینجا** نوشته می‌شود و نه زودتر.
  
     جایش (size−8, 8) است — درست وسطِ ناحیه‌ای که `reserveFormat` رزرو
     می‌کند. اگر پیش از آن نوشته می‌شد، رزرو صفرش می‌کرد و QR خراب
     می‌شد. (همان اشتباهی که تستِ ساختار گرفت.) */
  m[size - 8][8] = 1;
}

/** هشت الگوی ماسک — روی *داده* اعمال می‌شوند و نه روی الگوهای ثابت. */
function maskAt(mask: number, row: number, col: number): boolean {
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
 * چیدنِ بیت‌های داده — دو ستون در میان، از پایین-راست، مارپیچ.
 *
 * ⚠️ ستونِ ۶ رد می‌شود: خطِ زمان‌بندیِ عمودی آنجاست.
 */
function placeData(m: Matrix, codewords: Uint8Array, mask: number): void {
  const size = m.length;
  let bitIndex = 0;
  let upward = true;

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right = 5;

    for (let step = 0; step < size; step++) {
      const row = upward ? size - 1 - step : step;
      for (const col of [right, right - 1]) {
        if (m[row][col] !== -1) continue;

        const byte = codewords[bitIndex >> 3];
        const bit = byte === undefined ? 0 : (byte >> (7 - (bitIndex & 7))) & 1;
        bitIndex++;

        m[row][col] = maskAt(mask, row, col) ? (bit ^ 1) : bit;
      }
    }
    upward = !upward;
  }
}

/* ═══════════════════════ انتخابِ بهترین ماسک ═══════════════════════════ */

/**
 * جریمهٔ یک ماتریس — هرچه کمتر، خواناتر.
 *
 * چهار قاعدهٔ استاندارد: ردیف/ستونِ هم‌رنگِ پیاپی، بلوکِ ۲×۲، الگویی که
 * شبیهِ الگوی یاب است، و نامتوازنیِ نسبتِ تیره به روشن.
 */
function penalty(m: Matrix): number {
  const size = m.length;
  let score = 0;

  // قاعدهٔ ۱ — پنج ماژولِ هم‌رنگِ پیاپی و بیشتر.
  for (let i = 0; i < size; i++) {
    for (const line of [m[i], m.map((row) => row[i])]) {
      let run = 1;
      for (let j = 1; j < size; j++) {
        if (line[j] === line[j - 1]) run++;
        else {
          if (run >= 5) score += run - 2;
          run = 1;
        }
      }
      if (run >= 5) score += run - 2;
    }
  }

  // قاعدهٔ ۲ — هر بلوکِ ۲×۲ هم‌رنگ.
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = m[r][c];
      if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
    }
  }

  // قاعدهٔ ۳ — الگوی 1:1:3:1:1 با چهار ماژولِ روشن در یک طرف.
  const A = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const B = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  const matches = (line: number[], at: number, pattern: number[]) =>
    pattern.every((p, k) => line[at + k] === p);

  for (let i = 0; i < size; i++) {
    const rows = [Array.from(m[i]), m.map((row) => row[i])];
    for (const line of rows) {
      for (let j = 0; j + 11 <= size; j++) {
        if (matches(line, j, A) || matches(line, j, B)) score += 40;
      }
    }
  }

  // قاعدهٔ ۴ — انحرافِ نسبتِ ماژول‌های تیره از ۵۰٪.
  let dark = 0;
  for (const row of m) for (const v of row) if (v === 1) dark++;
  const percent = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;

  return score;
}

/* ═══════════════════════════ رابطِ بیرونی ══════════════════════════════ */

export type QrMatrix = {
  version: number;
  size: number;
  /** `true` یعنی ماژولِ تیره. */
  modules: boolean[][];
};

/**
 * متن → ماتریسِ QR.
 *
 * ⚠️ فقط ASCII پذیرفته می‌شود و این یک محدودیتِ عمدی است: رشتهٔ فارسی در
 * حالتِ بایت باید UTF-8 شود و اسکنرها در تفسیرش یکدست نیستند. لینکِ دعوتِ
 * ما همیشه ASCII است، و هر چیزِ دیگری باید با خطا رد شود و نه با یک QRِ
 * بی‌صدا-خراب.
 */
export function encodeQr(text: string): QrMatrix {
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code > 0x7f) throw new Error("QR فقط متنِ ASCII می‌پذیرد.");
    bytes[i] = code;
  }

  const version = pickVersion(bytes.length);
  const size = sizeOf(version);

  /* الگوهای ثابت یک بار کشیده می‌شوند و بینِ هشت ماسک مشترک‌اند. */
  const base = blankMatrix(size);
  placeFinder(base, 0, 0);
  placeFinder(base, 0, size - 7);
  placeFinder(base, size - 7, 0);
  placeAlignment(base, version);
  placeTiming(base);
  reserveFormat(base);

  const codewords = interleave(encodeData(bytes, version), version);

  let best: Matrix | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let mask = 0; mask < 8; mask++) {
    const candidate = base.map((row) => Int8Array.from(row));
    /* ⚠️ خانه‌های قالب با ۰ رزرو شده‌اند، پس باید دوباره «خالی» شوند
       وگرنه `placeData` ردشان می‌کند ولی `placeFormat` هم بعداً
       بازنویسی‌شان می‌کند — و آن ترتیب درست است. */
    placeData(candidate, codewords, mask);
    placeFormat(candidate, mask);

    const score = penalty(candidate);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return {
    version,
    size,
    modules: best!.map((row) => Array.from(row, (v) => v === 1)),
  };
}

/**
 * ماتریس → SVG.
 *
 * ⚠️ `shape-rendering="crispEdges"` لازم است: بدونِ آن مرورگر لبه‌ها را
 * نرم می‌کند و ماژول‌های کوچک در هم می‌روند — QRای که روی صفحه قشنگ است و
 * اسکن نمی‌شود.
 *
 * ⚠️ و حاشیهٔ چهار ماژولی («quiet zone») بخشی از استاندارد است و نه
 * تزئین؛ بدونِ آن بعضی اسکنرها اصلاً کد را پیدا نمی‌کنند.
 */
export function qrToSvg(matrix: QrMatrix, options: { size?: number } = {}): string {
  const QUIET = 4;
  const total = matrix.size + QUIET * 2;
  const pixels = options.size ?? 240;

  const path: string[] = [];
  for (let r = 0; r < matrix.size; r++) {
    for (let c = 0; c < matrix.size; c++) {
      if (matrix.modules[r][c]) path.push(`M${c + QUIET} ${r + QUIET}h1v1h-1z`);
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pixels}" height="${pixels}" ` +
    `viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" role="img">` +
    `<rect width="${total}" height="${total}" fill="#ffffff"/>` +
    `<path d="${path.join("")}" fill="#000000"/>` +
    `</svg>`
  );
}
