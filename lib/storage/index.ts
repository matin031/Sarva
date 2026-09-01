import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { logger } from "@/lib/observability";

/**
 * ذخیره‌سازی فایل، پشت یک واسط.
 *
 * الگویش عمداً همان چیزی است که lib/admin/upload-actions.ts از قبل توصیه
 * می‌کرد: چیزی که در دیتابیس ذخیره می‌شود فقط یک رشته است، و هیچ‌کجای اسکیما
 * یا فرم‌ها نمی‌داند آن رشته به کجا اشاره می‌کند.
 *
 * پیاده‌سازی فعلی روی دیسک خودِ سرور است (volume داکر) و Caddy سروشان می‌کند —
 * نه Next. دلیلش Range request است: wavesurfer در PanelAudioPlayer و
 * <audio> در CircularVisualizer برای seek و رسم موج، بایت‌های میانیِ فایل را
 * جداگانه می‌خواهند و یک route handler ساده همیشه کل فایل را می‌دهد.
 */

export type StoredFile = {
  /** کلید داخلی — مسیر نسبی داخل انبار. برای حذف لازم است. */
  key: string;
  /** آنچه در دیتابیس ذخیره و در <audio src> استفاده می‌شود. */
  url: string;
};

export type PutOptions = {
  prefix?: string;
  /** پسوندی که روی دیسک نوشته می‌شود. اجباری است تا هیچ فراخوانی نتواند
   *  ناخواسته پسوندِ نامِ کاربر را به دیسک برساند. */
  extension: string;
};

export interface StorageAdapter {
  readonly name: string;
  put(file: File, options: PutOptions): Promise<StoredFile>;
  remove(key: string): Promise<void>;
  urlFor(key: string): string;
}

// -------------------------------------------------- بررسی نوع واقعی فایل --

/**
 * فایل صوتیِ مجاز: پسوند + امضای بایتی.
 *
 * ⚠️ چرا فقط `file.type` کافی نبود:
 *
 * آن مقدار همان چیزی است که *فرستنده* در هدر multipart می‌نویسد. یک مرورگر
 * سالم آن را از پسوند فایل حدس می‌زند، ولی هر اسکریپتی می‌تواند هر چیزی
 * بنویسد. بررسی قبلی فقط `file.type.startsWith("audio/")` بود، یعنی فایلی به
 * نام `x.html` با محتوای HTML و هدرِ جعلیِ `audio/mpeg` قبول می‌شد، با پسوند
 * `.html` روی دیسک می‌نشست، و Caddy آن را با Content-Type: text/html روی
 * دامنهٔ خودِ سایت سرو می‌کرد — یعنی XSS دائمی روی مبدأ اصلی.
 *
 * حالا سه چیز باید هم‌زمان درست باشند: پسوند در فهرست سفید باشد، MIME اعلامی
 * با همان پسوند بخواند، و **بایت‌های اول خودِ فایل** امضای آن قالب را داشته
 * باشند. سومی همان چیزی است که جعل‌ناپذیر است.
 */
type AudioFormat = {
  /** پسوندی که روی دیسک نوشته می‌شود — همیشه از اینجا، هرگز از نام کاربر. */
  extension: string;
  mimeTypes: readonly string[];
  /** آیا بایت‌های ابتدای فایل با این قالب می‌خوانند؟ */
  matches: (head: Buffer) => boolean;
};

/** «آیا از بایت i این رشتهٔ ASCII شروع می‌شود؟» */
function hasAscii(head: Buffer, offset: number, marker: string): boolean {
  return head.subarray(offset, offset + marker.length).toString("latin1") === marker;
}

const AUDIO_FORMATS: readonly AudioFormat[] = [
  {
    extension: "mp3",
    mimeTypes: ["audio/mpeg", "audio/mp3", "audio/mpeg3", "audio/x-mpeg-3"],
    // یک MP3 یا با تگ ID3 شروع می‌شود یا مستقیم با frame sync (11 بیت یک).
    matches: (head) =>
      hasAscii(head, 0, "ID3") || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0),
  },
  {
    extension: "m4a",
    mimeTypes: ["audio/mp4", "audio/m4a", "audio/x-m4a"],
    // ساختار ISO-BMFF: چهار بایت طول، بعد "ftyp".
    matches: (head) => hasAscii(head, 4, "ftyp"),
  },
  {
    extension: "ogg",
    mimeTypes: ["audio/ogg", "application/ogg"],
    matches: (head) => hasAscii(head, 0, "OggS"),
  },
  {
    extension: "wav",
    mimeTypes: ["audio/wav", "audio/wave", "audio/x-wav", "audio/vnd.wave"],
    // RIFF....WAVE
    matches: (head) => hasAscii(head, 0, "RIFF") && hasAscii(head, 8, "WAVE"),
  },
  {
    extension: "webm",
    mimeTypes: ["audio/webm"],
    // EBML header — مشترک بین webm و mkv.
    matches: (head) =>
      head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3,
  },
  {
    extension: "flac",
    mimeTypes: ["audio/flac", "audio/x-flac"],
    matches: (head) => hasAscii(head, 0, "fLaC"),
  },
];

export type FileTypeCheck =
  | { ok: true; extension: string }
  | { ok: false; error: string };

/**
 * نوع واقعی فایل صوتی را تشخیص می‌دهد.
 *
 * MIME اعلام‌شده فقط برای *محدود کردنِ* گزینه‌هاست، نه برای تأیید: اول قالبی
 * که ادعا شده امتحان می‌شود (تا خطای دقیق‌تری بدهیم)، بعد بقیه — چون بعضی
 * مرورگرها برای همان فایل MIME متفاوتی می‌فرستند و رد کردن یک mp3 سالم فقط
 * به این دلیل که مرورگر «audio/mp3» نوشته و نه «audio/mpeg»، آزاردهنده است.
 *
 * چیزی که هرگز کوتاه نمی‌آید: بایت‌های خودِ فایل باید بخوانند.
 */
export async function detectAudioFile(file: File): Promise<FileTypeCheck> {
  const head = Buffer.from(await file.slice(0, 16).arrayBuffer());
  if (head.length < 12) return { ok: false, error: "فایل خالی یا ناقص است." };

  const declared = (file.type || "").toLowerCase().split(";")[0].trim();
  const preferred = AUDIO_FORMATS.filter((f) => f.mimeTypes.includes(declared));
  const rest = AUDIO_FORMATS.filter((f) => !f.mimeTypes.includes(declared));

  for (const format of [...preferred, ...rest]) {
    if (format.matches(head)) return { ok: true, extension: format.extension };
  }

  return {
    ok: false,
    error: "محتوای فایل یک فایل صوتی معتبر نیست. فقط mp3، m4a، ogg، wav، webm و flac پذیرفته می‌شود.",
  };
}

/** نام فایلِ امن و یکتا.
 *
 *  یکتا بودنش دو کار می‌کند: جلوی بازنویسی فایل قبلی را می‌گیرد، و چون یک URL
 *  هرگز محتوایش عوض نمی‌شود، هدر immutable در Caddyfile درست می‌شود.
 *
 *  ⚠️ پسوند دیگر از نام فایلِ کاربر نمی‌آید.
 *
 *  نسخهٔ قبلی نام اصلی را پاک‌سازی می‌کرد و نگه می‌داشت — که برای عبور از
 *  path traversal کافی بود ولی پسوند را دست‌نخورده باقی می‌گذاشت. یعنی
 *  `evil.html` بعد از پاک‌سازی همچنان `evil.html` بود و روی دیسک با همان
 *  پسوند می‌نشست. حالا پسوند را *فراخوان* تعیین می‌کند و او هم آن را از
 *  detectAudioFile می‌گیرد، یعنی از بایت‌های واقعیِ فایل.
 *
 *  بخشی از نام اصلی فقط به‌عنوان برچسبِ خوانا نگه داشته می‌شود (تا ادمین در
 *  پوشهٔ uploads بفهمد چه چیزی چیست)، بدون هیچ نقطه‌ای. */
function safeName(originalName: string, extension: string): string {
  const label = originalName
    .replace(/\.[^.]*$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);

  const stem = `${Date.now()}-${randomBytes(8).toString("hex")}`;
  return label ? `${stem}-${label}.${extension}` : `${stem}.${extension}`;
}

// ------------------------------------------------------------ دیسک محلی --

class LocalDiskAdapter implements StorageAdapter {
  readonly name = "local";

  private root(): string {
    return resolve(process.env.UPLOADS_DIR ?? "./uploads");
  }

  private publicBase(): string {
    return (process.env.UPLOADS_PUBLIC_BASE ?? "/uploads").replace(/\/+$/, "");
  }

  async put(file: File, options: PutOptions): Promise<StoredFile> {
    // prefix از کد می‌آید نه از کاربر، ولی باز هم پاک‌سازی می‌شود: اگر روزی
    // کسی مقداری از ورودی به آن وصل کند، «../..» نباید از انبار بیرون بزند.
    const prefix = (options.prefix ?? "").replace(/[^a-zA-Z0-9/_-]/g, "").replace(/^\/+|\/+$/g, "");
    const name = safeName(file.name, options.extension);
    const key = prefix ? `${prefix}/${name}` : name;

    const target = join(this.root(), key);

    // کمربند دوم: مسیر نهایی حتماً باید داخل انبار باشد.
    if (!target.startsWith(this.root() + sep)) {
      throw new Error("مسیر فایل نامعتبر است.");
    }

    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, Buffer.from(await file.arrayBuffer()));

    return { key, url: this.urlFor(key) };
  }

  async remove(key: string): Promise<void> {
    const target = join(this.root(), key);
    if (!target.startsWith(this.root() + sep)) return;
    // نبودنِ فایل خطا نیست: حذفِ چیزی که از قبل نیست، همان نتیجهٔ مطلوب است.
    await unlink(target).catch(() => {});
  }

  urlFor(key: string): string {
    return `${this.publicBase()}/${key}`;
  }
}

// --------------------------------------------------------------- انتخاب --

let cached: StorageAdapter | null = null;

export function storageAdapter(): StorageAdapter {
  if (cached) return cached;

  const driver = (process.env.STORAGE_DRIVER ?? "local").toLowerCase();
  if (driver !== "local") {
    logger.warn("STORAGE_DRIVER پیاده‌سازی نشده — از local استفاده شد", {
      event: "storage.driver.unknown",
      storage_driver: driver,
    });
  }

  cached = new LocalDiskAdapter();
  return cached;
}

export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 15) * 1024 * 1024;
