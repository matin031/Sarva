/**
 * سروِ فایل‌های آپلودی — جانشینِ Caddy روی هاست اشتراکی.
 *
 * =============================================================================
 * ⚠️ چرا این مسیر لازم شد
 * =============================================================================
 *
 * روی سرورِ داکری، Caddy فایل‌های /uploads/* را مستقیم از دیسک می‌داد و Next
 * اصلاً آن‌ها را نمی‌دید. روی هاست اشتراکی cPanel هیچ Caddy ای نیست.
 *
 * وسوسهٔ اول این بود که فایل‌ها را داخل `public/` بگذاریم و بگذاریم Next
 * سروشان کند. **آزموده شد و کار نمی‌کند:** فهرست فایل‌های `public/` در زمانِ
 * build ساخته می‌شود، پس هر فایلی که مدیر *بعد* از build آپلود کند ۴۰۴
 * می‌گیرد. یعنی هر صوتی که از پنل اضافه شود، باز نمی‌شود.
 *
 * =============================================================================
 * ⚠️ چرا فقط `new Response(file)` کافی نیست
 * =============================================================================
 *
 * پخش‌کننده‌های این سایت — wavesurfer در PanelAudioPlayer و <audio> در
 * CircularVisualizer — برای seek کردن و رسم موج، *بایت‌های میانیِ* فایل را
 * جداگانه می‌خواهند و این کار را با هدر `Range` انجام می‌دهند.
 *
 * یک هندلرِ ساده که کل فایل را با ۲۰۰ برمی‌گرداند، از نظر مرورگر یعنی «این
 * سرور Range بلد نیست»: نوار پیشرفت از کار می‌افتد، پرش به وسط فایل کار
 * نمی‌کند، و روی فایل بلند کلِ آن دوباره دانلود می‌شود.
 *
 * پس اینجا Range کامل پیاده شده: ۲۰۶ با Content-Range، ۴۱۶ برای بازهٔ
 * نامعتبر، و `Accept-Ranges: bytes` روی همهٔ پاسخ‌ها تا مرورگر اصلاً بداند
 * می‌تواند بخواهد.
 */

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join, sep, normalize, extname } from "node:path";
import { Readable } from "node:stream";

import { uploadsRoot } from "@/lib/storage";

/**
 * ⚠️ این مسیر هرگز نباید کش شود *به‌عنوان یک صفحه*.
 *
 * force-dynamic چون فایل‌ها در زمان اجرا ساخته می‌شوند و هیچ‌کدام در زمان
 * build وجود ندارند. کشِ خودِ فایل با هدر Cache-Control پایین انجام می‌شود که
 * کارِ درست‌تری است: مرورگر کش می‌کند، سرور رندر دوباره نمی‌کند.
 */
export const dynamic = "force-dynamic";

/** فقط همان چیزهایی که این سایت واقعاً آپلود می‌کند. */
const CONTENT_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".mp4": "audio/mp4",
  ".ogg": "audio/ogg",
  ".oga": "audio/ogg",
  ".opus": "audio/ogg",
  ".wav": "audio/wav",
  ".webm": "audio/webm",
  ".flac": "audio/flac",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

/**
 * مسیرِ امنِ روی دیسک، یا null اگر از انبار بیرون بزند.
 *
 * ⚠️ سه لایه، و هر سه لازم‌اند:
 *
 *   ۱) هر جزء مسیر که «..» یا خالی یا شاملِ جداکننده باشد رد می‌شود. این
 *      جلوی سادهٔ `/uploads/../../etc/passwd` را می‌گیرد.
 *   ۲) بایتِ صفر رد می‌شود. در بعضی لایه‌های نیتیو، رشته همان‌جا بریده
 *      می‌شود و «x.mp3\0../../etc/passwd» می‌تواند معنای دیگری بگیرد.
 *   ۳) و در پایان، مسیرِ نهایی باید *واقعاً* زیر ریشه باشد. دو تای اول
 *      استدلال‌اند؛ این یکی اثبات است.
 */
function safeTarget(segments: string[]): string | null {
  if (segments.length === 0) return null;

  for (const s of segments) {
    if (!s || s === "." || s === ".." || s.includes("\0") || s.includes("/") || s.includes("\\")) {
      return null;
    }
  }

  const root = uploadsRoot();
  const target = normalize(join(root, ...segments));
  if (target !== root && !target.startsWith(root + sep)) return null;
  return target;
}

/** بازهٔ خواسته‌شده، یا "invalid" اگر هدر Range بی‌معنا باشد. */
function parseRange(
  header: string | null,
  size: number,
): { start: number; end: number } | "invalid" | null {
  if (!header) return null;

  // فقط تک‌بازه پشتیبانی می‌شود. چندبازه‌ای (multipart/byteranges) را هیچ
  // پخش‌کنندهٔ صوتی‌ای نمی‌فرستد و پیاده کردنش فقط سطح خطا اضافه می‌کند.
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  if (rawStart === "" && rawEnd === "") return "invalid";

  let start: number;
  let end: number;

  if (rawStart === "") {
    // «bytes=-500» یعنی ۵۰۰ بایتِ *آخر*.
    const wanted = Number(rawEnd);
    if (wanted === 0) return "invalid";
    start = Math.max(0, size - wanted);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Number(rawEnd);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) return "invalid";
  if (start > end || start >= size) return "invalid";
  return { start, end: Math.min(end, size - 1) };
}

async function serve(request: Request, segments: string[], withBody: boolean): Promise<Response> {
  const target = safeTarget(segments);
  if (!target) return new Response("Not found", { status: 404 });

  let info;
  try {
    info = await stat(target);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!info.isFile()) return new Response("Not found", { status: 404 });

  const size = info.size;
  const type = CONTENT_TYPES[extname(target).toLowerCase()] ?? "application/octet-stream";

  const headers = new Headers({
    "Content-Type": type,
    // بدون این، مرورگر اصلاً Range نمی‌فرستد.
    "Accept-Ranges": "bytes",
    // نام فایل‌ها شاملِ زمان و بایتِ تصادفی است، پس هرگز محتوایشان عوض
    // نمی‌شود و کشِ بلند بی‌خطر است.
    "Cache-Control": "public, max-age=31536000, immutable",
    // ⚠️ فایل را مرورگر نباید «حدس بزند» چیست. بدون این، یک SVG آپلودی
    // می‌تواند به‌عنوان HTML اجرا شود.
    "X-Content-Type-Options": "nosniff",
    ETag: `"${info.mtimeMs.toString(36)}-${size.toString(36)}"`,
  });

  const range = parseRange(request.headers.get("range"), size);

  if (range === "invalid") {
    headers.set("Content-Range", `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }

  if (!range) {
    headers.set("Content-Length", String(size));
    if (!withBody) return new Response(null, { status: 200, headers });
    const stream = Readable.toWeb(createReadStream(target)) as unknown as ReadableStream;
    return new Response(stream, { status: 200, headers });
  }

  headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
  headers.set("Content-Length", String(range.end - range.start + 1));
  if (!withBody) return new Response(null, { status: 206, headers });

  const stream = Readable.toWeb(
    createReadStream(target, { start: range.start, end: range.end }),
  ) as unknown as ReadableStream;
  return new Response(stream, { status: 206, headers });
}

export async function GET(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return serve(request, path, true);
}

/**
 * HEAD جدا لازم است: پخش‌کننده‌ها اول با HEAD طولِ فایل و پشتیبانی از Range
 * را می‌پرسند و بعد تصمیم می‌گیرند چطور بخوانند.
 */
export async function HEAD(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return serve(request, path, false);
}
