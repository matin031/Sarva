import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { watermarkImage } from "./vocab-watermark";

/**
 * خروجیِ واترمارک‌شده، یک بار ساخته و بعد از روی دیسک سِرو می‌شود.
 *
 * ⚠️ چرا لازم شد: `watermarkImage` در *هر* درخواست اجرا می‌شد. اندازه‌گیری
 * روی یک تصویر ۲۳ کیلوبایتی: میانهٔ ۷۵ میلی‌ثانیه CPU. بازی واژه‌یاب تصاویر
 * زیادی نشان می‌دهد و هر بازدیدکنندهٔ تازه همه را از نو می‌سازد. هدرِ
 * `immutable` فقط مرورگر را نجات می‌دهد، نه سرور را: اولین درخواستِ هر
 * مرورگر، هر cache miss، و هر درخواستِ هم‌زمان باز هم همان ۷۵ms را می‌گیرد.
 *
 * سه تصمیم و دلیلشان:
 *
 * ۱) کلید از *محتوای* فایل ساخته می‌شود، نه از مسیرش. اگر تصویری عوض شود،
 *    کلیدش هم عوض می‌شود و نسخهٔ کهنه هرگز سِرو نمی‌شود — چیزی که با کلیدِ
 *    مسیرمحور و هدرِ immutable خطرناک بود.
 *
 * ۲) نسخهٔ تنظیمات در کلید است. اگر روزی شکلِ واترمارک عوض شود، همان یک عدد
 *    را بالا می‌بریم و همهٔ خروجی‌های قدیمی خودبه‌خود کنار می‌روند.
 *
 * ۳) درخواست‌های هم‌زمانِ یک تصویر یک پردازشِ مشترک دارند. بدون آن، ده
 *    بازدیدکنندهٔ هم‌زمان ده بار همان کار را می‌کردند — دقیقاً وقتی سرور
 *    شلوغ‌تر است.
 *
 * عمداً بدونِ Redis یا سرویسِ تازه: یک پوشه روی همان ماشین کافی است و با
 * استقرارِ فعلی می‌خواند. اگر روزی چند replica شد، هرکدام کشِ خودش را
 * می‌سازد — که بدترین حالتش یک بار کارِ اضافه به‌ازای هر replica است، نه
 * نادرستی.
 */

/** با هر تغییر در شکلِ واترمارک این را یکی بالا ببرید. */
const WATERMARK_VERSION = 1;

const CACHE_DIR =
  process.env.VOCAB_IMAGE_CACHE_DIR?.trim() || join(tmpdir(), "sarva-vocab-images");

/** درخواست‌های در پرواز، تا کارِ تکراری هم‌زمان انجام نشود. */
const inFlight = new Map<string, Promise<Buffer>>();

function keyFor(src: Buffer): string {
  return createHash("sha256")
    .update(String(WATERMARK_VERSION))
    .update(":")
    .update(src)
    .digest("hex");
}

/**
 * نسخهٔ واترمارک‌شده — از کش اگر هست، وگرنه ساخته و ذخیره می‌شود.
 *
 * هر خطای کش (پوشهٔ غیرقابل‌نوشتن، دیسکِ پر) فقط یعنی «این بار از کش
 * استفاده نشد»، نه شکستِ درخواست: تصویر همچنان ساخته و برگردانده می‌شود.
 */
export async function watermarkCached(src: Buffer): Promise<Buffer> {
  const key = keyFor(src);
  const file = join(CACHE_DIR, `${key}.webp`);

  try {
    return await readFile(file);
  } catch {
    // در کش نبود — پایین ساخته می‌شود.
  }

  const running = inFlight.get(key);
  if (running) return running;

  const job = (async () => {
    const out = await watermarkImage(src);
    try {
      await mkdir(CACHE_DIR, { recursive: true });
      // ⚠️ اول در فایلِ موقت، بعد rename: اگر پردازش وسطِ کار قطع شود، یک
      // فایلِ نیمه‌نوشته جای خروجیِ سالم نمی‌نشیند. rename در همان
      // فایل‌سیستم اتمیک است.
      const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(tmp, out);
      await rename(tmp, file);
    } catch {
      // نوشتن نشد — فقط یعنی دفعهٔ بعد دوباره ساخته می‌شود.
    }
    return out;
  })();

  inFlight.set(key, job);
  try {
    return await job;
  } finally {
    inFlight.delete(key);
  }
}

/** برای تست: مسیرِ کش و نسخهٔ تنظیمات. */
export const __cacheInfo = { dir: CACHE_DIR, version: WATERMARK_VERSION };
