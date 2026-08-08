import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

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

export interface StorageAdapter {
  readonly name: string;
  put(file: File, options?: { prefix?: string }): Promise<StoredFile>;
  remove(key: string): Promise<void>;
  urlFor(key: string): string;
}

/** نام فایلِ امن و یکتا.
 *
 *  یکتا بودنش دو کار می‌کند: جلوی بازنویسی فایل قبلی را می‌گیرد، و چون یک URL
 *  هرگز محتوایش عوض نمی‌شود، هدر immutable در Caddyfile درست می‌شود. */
function safeName(originalName: string): string {
  const cleaned = originalName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    // جلوی نام‌های عجیبِ بلند را می‌گیرد بدون اینکه پسوند از دست برود
    .slice(-80);
  return `${Date.now()}-${randomBytes(4).toString("hex")}-${cleaned}`;
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

  async put(file: File, options: { prefix?: string } = {}): Promise<StoredFile> {
    // prefix از کد می‌آید نه از کاربر، ولی باز هم پاک‌سازی می‌شود: اگر روزی
    // کسی مقداری از ورودی به آن وصل کند، «../..» نباید از انبار بیرون بزند.
    const prefix = (options.prefix ?? "").replace(/[^a-zA-Z0-9/_-]/g, "").replace(/^\/+|\/+$/g, "");
    const key = prefix ? `${prefix}/${safeName(file.name)}` : safeName(file.name);

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
    console.warn(`[storage] STORAGE_DRIVER «${driver}» پیاده‌سازی نشده — از local استفاده شد.`);
  }

  cached = new LocalDiskAdapter();
  return cached;
}

export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_MB ?? 15) * 1024 * 1024;
